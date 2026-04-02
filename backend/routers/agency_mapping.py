from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from database import get_db
from models.user import User, UserRole
from models.agency import Agency, AgencyMapping, PMSAJAYComponent, AgencyType, AgencyRole, FundAllocation, ProjectMilestone, MilestoneStatus
from schemas.agency import (
    AgencyCreate,
    AgencyResponse,
    AgencyMappingCreate,
    AgencyMappingResponse,
    FundAllocationCreate,
    FundAllocationResponse,
    ProjectMilestoneCreate,
    ProjectMilestoneResponse,
    AgencyDashboardResponse,
)
from routers.auth import get_current_active_user, verify_role
from utils.notification_utils import create_notification

router = APIRouter()


@router.get("/list")
async def list_agencies(
    skip: int = 0,
    limit: int = 25,
    state: Optional[str] = None,
    type: Optional[AgencyType] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(Agency)
    if state:
        query = query.filter(Agency.state == state)
    if type:
        query = query.filter(Agency.type == type)
    items = query.order_by(Agency.name).offset(skip).limit(limit).all()
    return {"items": [AgencyResponse.model_validate(item).model_dump() for item in items], "total": query.count()}


@router.post("/register", response_model=AgencyResponse)
async def register_agency(
    payload: AgencyCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    verify_role(current_user, [UserRole.ADMIN])
    agency = Agency(**payload.model_dump())
    db.add(agency)
    db.commit()
    db.refresh(agency)
    create_notification(
        db,
        user_id=current_user.id,
        title="Agency registered",
        message=f"{agency.name} has been added to the registry.",
        kind="success",
        link_path="/agency/directory",
        entity_type="agency",
        entity_id=agency.id,
    )
    return agency


@router.get("/mapping/dashboard")
async def mapping_dashboard(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    mappings = db.query(AgencyMapping).all()
    fund_allocations = db.query(FundAllocation).all()
    milestones = db.query(ProjectMilestone).all()
    by_component = Counter(m.component.name.value for m in mappings if m.component and m.component.name)
    by_state = Counter(m.state for m in mappings if m.state)
    return {
        "total_agencies": db.query(func.count(Agency.id)).scalar() or 0,
        "total_mappings": len(mappings),
        "fund_utilization_rate": round((sum((f.total_utilized or 0) for f in fund_allocations) / max(sum((f.total_allocated or 0) for f in fund_allocations), 1)) * 100, 2) if fund_allocations else 0.0,
        "pending_milestones": sum(1 for m in milestones if m.status != MilestoneStatus.COMPLETED),
        "by_component": dict(by_component),
        "by_state": dict(by_state),
    }


@router.get("/fund-flow")
async def fund_flow(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    allocations = db.query(FundAllocation).all()
    by_state = Counter()
    by_component = Counter()
    total_allocated = 0.0
    total_released = 0.0
    total_utilized = 0.0
    for allocation in allocations:
        mapping = allocation.mapping
        total_allocated += allocation.total_allocated or 0
        total_released += allocation.total_released or 0
        total_utilized += allocation.total_utilized or 0
        if mapping:
            key = f"{mapping.state}:{mapping.component.name.value if mapping.component and mapping.component.name else 'unknown'}"
            by_state[mapping.state] += allocation.total_utilized or 0
            by_component[key] += allocation.total_utilized or 0
    return {
        "totals": {
            "allocated": round(total_allocated, 2),
            "released": round(total_released, 2),
            "utilized": round(total_utilized, 2),
        },
        "by_state": dict(by_state),
        "by_component": dict(by_component),
        "allocations": len(allocations),
    }


@router.get("/{agency_id}")
async def get_agency(agency_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if agency is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agency not found")
    mappings = db.query(AgencyMapping).filter(AgencyMapping.agency_id == agency_id).all()
    milestones = db.query(ProjectMilestone).join(AgencyMapping).filter(AgencyMapping.agency_id == agency_id).all()
    return {
        "agency": AgencyResponse.model_validate(agency).model_dump(),
        "mappings": [AgencyMappingResponse.model_validate(m).model_dump() for m in mappings],
        "milestones": [ProjectMilestoneResponse.model_validate(m).model_dump() for m in milestones],
    }


@router.post("/mapping", response_model=AgencyMappingResponse)
async def create_mapping(
    payload: AgencyMappingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    verify_role(current_user, [UserRole.ADMIN, UserRole.STATE_OFFICER])
    mapping = AgencyMapping(**payload.model_dump())
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    create_notification(
        db,
        user_id=current_user.id,
        title="Agency mapping created",
        message="A new agency responsibility mapping was saved.",
        kind="success",
        link_path="/agency/accountability",
        entity_type="agency_mapping",
        entity_id=mapping.id,
    )
    return mapping


@router.post("/fund-allocation", response_model=FundAllocationResponse)
async def create_fund_allocation(
    payload: FundAllocationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    verify_role(current_user, [UserRole.ADMIN, UserRole.STATE_OFFICER])
    allocation = FundAllocation(mapping_id=payload.mapping_id, total_allocated=payload.total_allocated, financial_year=payload.financial_year)
    db.add(allocation)
    db.commit()
    db.refresh(allocation)
    create_notification(
        db,
        user_id=current_user.id,
        title="Fund allocation recorded",
        message=f"Allocation of ₹{payload.total_allocated:,.2f} was saved.",
        kind="success",
        link_path="/agency/fund-flow",
        entity_type="fund_allocation",
        entity_id=allocation.id,
    )
    return allocation


@router.get("/accountability-matrix")
async def accountability_matrix(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    mappings = db.query(AgencyMapping).all()
    return [
        {
            "agency": m.agency.name if m.agency else None,
            "component": m.component.name.value if m.component and m.component.name else None,
            "role": m.role.value,
            "state": m.state,
            "status": m.status,
            "milestones": len(m.project_milestones),
        }
        for m in mappings
    ]


@router.post("/milestone", response_model=ProjectMilestoneResponse)
async def add_milestone(
    payload: ProjectMilestoneCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    verify_role(current_user, [UserRole.ADMIN, UserRole.STATE_OFFICER])
    milestone = ProjectMilestone(mapping_id=payload.mapping_id, milestone_name=payload.milestone_name, target_date=payload.target_date, remarks=payload.remarks)
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


@router.patch("/milestone/{milestone_id}", response_model=ProjectMilestoneResponse)
async def update_milestone(
    milestone_id: int,
    payload: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    verify_role(current_user, [UserRole.ADMIN, UserRole.STATE_OFFICER])
    milestone = db.query(ProjectMilestone).filter(ProjectMilestone.id == milestone_id).first()
    if milestone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")
    if "status" in payload:
        milestone.status = MilestoneStatus(payload["status"])
    if payload.get("completion_date"):
        milestone.completion_date = datetime.fromisoformat(payload["completion_date"])
    if payload.get("remarks") is not None:
        milestone.remarks = payload["remarks"]
    db.commit()
    db.refresh(milestone)
    create_notification(
        db,
        user_id=current_user.id,
        title="Milestone updated",
        message=f"Milestone #{milestone.id} has been updated.",
        kind="info",
        link_path="/agency/accountability",
        entity_type="milestone",
        entity_id=milestone.id,
    )
    return milestone
