from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from database import get_db
from models.user import User, UserRole
from models.village import Village, InfrastructureItem, GapReport, InfrastructureCategory, InfrastructureStatus
from schemas.village import (
    VillageCreate,
    VillageResponse,
    InfrastructureItemCreate,
    InfrastructureItemResponse,
    GapReportResponse,
    VillageMapData,
    VillageStatsResponse,
)
from routers.auth import get_current_active_user, verify_role
from ml.gap_analyzer import evaluate_village_gap

router = APIRouter()


def _latest_report(db: Session, village: Village) -> GapReport:
    report = db.query(GapReport).filter(GapReport.village_id == village.id).order_by(desc(GapReport.generated_at)).first()
    if report is None:
        report = regenerate_report(db, village)
    return report


def regenerate_report(db: Session, village: Village) -> GapReport:
    items = db.query(InfrastructureItem).filter(InfrastructureItem.village_id == village.id).all()
    score, gap_summary, interventions = evaluate_village_gap(village, items)
    report = db.query(GapReport).filter(GapReport.village_id == village.id).order_by(desc(GapReport.generated_at)).first()
    if report is None:
        report = GapReport(
            village_id=village.id,
            gap_score=score,
            gap_summary=gap_summary,
            recommended_interventions=interventions,
        )
        db.add(report)
    else:
        report.gap_score = score
        report.gap_summary = gap_summary
        report.recommended_interventions = interventions
    db.commit()
    db.refresh(report)
    return report


@router.get("/list")
async def list_villages(
    skip: int = 0,
    limit: int = 25,
    state: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(Village)
    if state:
        query = query.filter(Village.state == state)
    villages = query.order_by(Village.name).offset(skip).limit(limit).all()
    payload = []
    for village in villages:
        report = _latest_report(db, village)
        payload.append({
            "village": VillageResponse.model_validate(village).model_dump(),
            "gap_report": GapReportResponse.model_validate(report).model_dump(),
        })
    return {"items": payload, "total": query.count()}


@router.get("/{village_id}", response_model=VillageResponse)
async def get_village(village_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    village = db.query(Village).filter(Village.id == village_id).first()
    if village is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Village not found")
    return village


@router.get("/{village_id}/infra")
async def village_infrastructure(village_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    village = db.query(Village).filter(Village.id == village_id).first()
    if village is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Village not found")
    items = db.query(InfrastructureItem).filter(InfrastructureItem.village_id == village_id).order_by(InfrastructureItem.category, InfrastructureItem.item_name).all()
    return {"items": [
        {
            "id": item.id,
            "category": item.category.value,
            "item_name": item.item_name,
            "status": item.status.value,
            "last_verified": item.last_verified,
            "notes": item.notes,
        }
        for item in items
    ]}


@router.post("/{village_id}/infra", response_model=InfrastructureItemResponse)
async def upsert_infrastructure(
    village_id: int,
    payload: InfrastructureItemCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    verify_role(current_user, [UserRole.STATE_OFFICER, UserRole.ADMIN])
    village = db.query(Village).filter(Village.id == village_id).first()
    if village is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Village not found")
    item = db.query(InfrastructureItem).filter(
        InfrastructureItem.village_id == village_id,
        InfrastructureItem.category == payload.category,
        InfrastructureItem.item_name == payload.item_name,
    ).first()
    if item is None:
        item = InfrastructureItem(
            village_id=village_id,
            category=payload.category,
            item_name=payload.item_name,
            status=payload.status,
            notes=payload.notes,
        )
        db.add(item)
    else:
        item.status = payload.status
        item.notes = payload.notes
    db.commit()
    db.refresh(item)
    regenerate_report(db, village)
    return item


@router.get("/{village_id}/gap-report", response_model=GapReportResponse)
async def get_gap_report(village_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    village = db.query(Village).filter(Village.id == village_id).first()
    if village is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Village not found")
    return _latest_report(db, village)


@router.post("/generate-reports")
async def generate_reports(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    verify_role(current_user, [UserRole.STATE_OFFICER, UserRole.ADMIN])
    villages = db.query(Village).all()
    reports = []
    for village in villages:
        reports.append(regenerate_report(db, village))
    for index, report in enumerate(sorted(reports, key=lambda item: item.gap_score, reverse=True), start=1):
        report.priority_rank = index
    db.commit()
    return {"message": "Reports generated", "count": len(reports)}


@router.get("/map-data")
async def village_map_data(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    villages = db.query(Village).all()
    results = []
    for village in villages:
        report = _latest_report(db, village)
        risk_color = "#16a34a" if report.gap_score < 35 else "#d97706" if report.gap_score < 65 else "#dc2626"
        results.append({
            "id": village.id,
            "name": village.name,
            "state": village.state,
            "district": village.district,
            "lat": village.lat,
            "lng": village.lng,
            "gap_score": report.gap_score,
            "sc_population_pct": village.sc_population_pct,
            "total_population": village.total_population,
            "is_adarsh_gram": village.is_adarsh_gram,
            "risk_color": risk_color,
        })
    return results


@router.get("/stats", response_model=VillageStatsResponse)
async def village_stats(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    villages = db.query(Village).all()
    reports = [ _latest_report(db, village) for village in villages ] if villages else []
    total_gap = sum(r.gap_score for r in reports)
    by_state = Counter(v.state for v in villages if v.state)
    total_sc_population = sum(int(v.sc_population_pct * v.total_population / 100) for v in villages)
    return VillageStatsResponse(
        total_villages=len(villages),
        average_gap_score=round(total_gap / len(reports), 2) if reports else 0.0,
        adarsh_gram_percentage=round((sum(1 for v in villages if v.is_adarsh_gram) / len(villages) * 100), 2) if villages else 0.0,
        total_sc_population=total_sc_population,
        by_state=dict(by_state),
    )
