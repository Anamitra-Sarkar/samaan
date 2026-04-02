from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from database import get_db
from models.user import User, UserRole
from models.dbt import Victim, DBTCase, Disbursement, GrievanceTicket, CaseType, AssistanceType, DBTStatus, VerificationStatus, GrievanceCategory, GrievanceStatus
from schemas.dbt import (
    VictimCreate,
    VictimResponse,
    DBTCaseCreate,
    DBTCaseResponse,
    DisbursementCreate,
    DisbursementResponse,
    GrievanceCreate,
    GrievanceResponse,
    DBTTimelineItem,
    DBTTimelineResponse,
    DBTDashboardResponse,
)
from routers.auth import get_current_active_user, verify_role
from utils.notification_utils import create_notification

router = APIRouter()


def verify_aadhaar_mock(aadhaar_last4: str, name: str) -> dict:
    return {"verified": True, "message": "Mock Aadhaar verification — integrate with UIDAI in production"}


def verify_digilocker_mock(victim_id: int) -> dict:
    return {"verified": True, "documents": ["FIR Copy", "Medical Certificate"]}


def verify_cctns_mock(fir_number: str) -> dict:
    return {"verified": True, "case_status": "Under investigation"}


@router.post("/register-victim", response_model=VictimResponse)
async def register_victim(
    payload: VictimCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    victim = Victim(**payload.model_dump())
    db.add(victim)
    db.commit()
    db.refresh(victim)
    create_notification(
        db,
        user_id=current_user.id,
        title="Victim registered",
        message=f"Victim {victim.name} was registered successfully.",
        kind="success",
        link_path="/dbt/victims",
        entity_type="victim",
        entity_id=victim.id,
    )
    return victim


@router.get("/victims")
async def list_victims(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    victims = db.query(Victim).order_by(desc(Victim.created_at)).all()
    return {"items": [VictimResponse.model_validate(v).model_dump() for v in victims], "total": len(victims)}


@router.post("/verify/{victim_id}", response_model=VictimResponse)
async def verify_victim(victim_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    victim = db.query(Victim).filter(Victim.id == victim_id).first()
    if victim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Victim not found")
    aadhaar = verify_aadhaar_mock(victim.aadhaar_last4 or "", victim.name)
    digi = verify_digilocker_mock(victim.id)
    cctns = verify_cctns_mock(victim.fir_number)
    if aadhaar["verified"] and digi["verified"] and cctns["verified"]:
        victim.verification_status = VerificationStatus.VERIFIED
        victim.digilocker_verified = True
        victim.cctns_verified = True
    db.commit()
    db.refresh(victim)
    return victim


@router.post("/create-case", response_model=DBTCaseResponse)
async def create_case(
    payload: DBTCaseCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    victim = db.query(Victim).filter(Victim.id == payload.victim_id).first()
    if victim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Victim not found")
    case = DBTCase(victim_id=payload.victim_id, assistance_type=payload.assistance_type, approved_amount=payload.approved_amount, status=DBTStatus.UNDER_REVIEW)
    db.add(case)
    db.commit()
    db.refresh(case)
    create_notification(
        db,
        user_id=current_user.id,
        title="DBT case created",
        message=f"Case #{case.id} is now under review.",
        kind="info",
        link_path=f"/dbt/case/{case.id}",
        entity_type="dbt_case",
        entity_id=case.id,
    )
    return case


@router.get("/cases")
async def list_cases(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    cases = db.query(DBTCase).order_by(desc(DBTCase.created_at)).all()
    return {"items": [DBTCaseResponse.model_validate(case).model_dump() for case in cases], "total": len(cases)}


@router.get("/case/{case_id}")
async def get_case(case_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    case = db.query(DBTCase).filter(DBTCase.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return {
        "case": DBTCaseResponse.model_validate(case).model_dump(),
        "victim": VictimResponse.model_validate(case.victim).model_dump() if case.victim else None,
        "disbursements": [DisbursementResponse.model_validate(item).model_dump() for item in case.disbursements],
        "grievances": [GrievanceResponse.model_validate(item).model_dump() for item in case.grievances],
    }


@router.patch("/case/{case_id}/sanction", response_model=DBTCaseResponse)
async def sanction_case(case_id: int, payload: dict, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    verify_role(current_user, [UserRole.ADMIN, UserRole.STATE_OFFICER])
    case = db.query(DBTCase).filter(DBTCase.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    case.approved_amount = float(payload.get("approved_amount", case.approved_amount))
    case.status = DBTStatus.SANCTIONED
    db.commit()
    db.refresh(case)
    create_notification(
        db,
        user_id=current_user.id,
        title="DBT case sanctioned",
        message=f"Case #{case.id} was sanctioned successfully.",
        kind="success",
        link_path=f"/dbt/case/{case.id}",
        entity_type="dbt_case",
        entity_id=case.id,
    )
    return case


@router.post("/case/{case_id}/disburse", response_model=DisbursementResponse)
async def disburse_case(
    case_id: int,
    payload: DisbursementCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    verify_role(current_user, [UserRole.ADMIN, UserRole.STATE_OFFICER])
    case = db.query(DBTCase).filter(DBTCase.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    ref = f"MOCK-TXN-{uuid4().hex[:12].upper()}"
    disbursement = Disbursement(case_id=case_id, amount=payload.amount, transaction_ref=ref, bank_account_last4=payload.bank_account_last4, remarks=payload.remarks)
    case.disbursed_amount = (case.disbursed_amount or 0) + payload.amount
    case.status = DBTStatus.DISBURSED
    db.add(disbursement)
    db.commit()
    db.refresh(disbursement)
    create_notification(
        db,
        user_id=current_user.id,
        title="DBT disbursement completed",
        message=f"Transaction {ref} was recorded successfully.",
        kind="success",
        link_path=f"/dbt/case/{case.id}",
        entity_type="disbursement",
        entity_id=disbursement.id,
    )
    return disbursement


@router.get("/case/{case_id}/timeline", response_model=DBTTimelineResponse)
async def timeline(case_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    case = db.query(DBTCase).filter(DBTCase.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    victim = case.victim
    items = [
        DBTTimelineItem(step="registered", timestamp=case.created_at, status="done", notes="Case created", performed_by=case.assigned_officer.name if case.assigned_officer else None),
    ]
    if victim:
        items.append(DBTTimelineItem(step="verified", timestamp=victim.updated_at or victim.created_at, status=victim.verification_status.value, notes="Verification status updated", performed_by=None))
    if case.status in {DBTStatus.SANCTIONED, DBTStatus.DISBURSED, DBTStatus.CLOSED}:
        items.append(DBTTimelineItem(step="sanctioned", timestamp=case.updated_at or case.created_at, status="done", notes="Approved amount sanctioned", performed_by=None))
    if case.disbursements:
        latest = case.disbursements[-1]
        items.append(DBTTimelineItem(step="disbursed", timestamp=latest.disbursed_at, status="done", notes=latest.transaction_ref, performed_by=None))
    return DBTTimelineResponse(case_id=case_id, timeline=items)


@router.post("/grievance", response_model=GrievanceResponse)
async def submit_grievance(payload: GrievanceCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    grievance = GrievanceTicket(**payload.model_dump(), status=GrievanceStatus.OPEN)
    db.add(grievance)
    db.commit()
    db.refresh(grievance)
    create_notification(
        db,
        user_id=current_user.id,
        title="Grievance submitted",
        message=f"Grievance #{grievance.id} has been logged.",
        kind="info",
        link_path="/dbt/grievance",
        entity_type="grievance",
        entity_id=grievance.id,
    )
    return grievance


@router.get("/grievance")
async def list_grievance(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    grievances = db.query(GrievanceTicket).order_by(desc(GrievanceTicket.created_at)).all()
    return {"items": [GrievanceResponse.model_validate(g).model_dump() for g in grievances], "total": len(grievances)}


@router.patch("/grievance/{grievance_id}/resolve", response_model=GrievanceResponse)
async def resolve_grievance(grievance_id: int, payload: dict, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    verify_role(current_user, [UserRole.ADMIN, UserRole.STATE_OFFICER])
    grievance = db.query(GrievanceTicket).filter(GrievanceTicket.id == grievance_id).first()
    if grievance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grievance not found")
    grievance.status = GrievanceStatus.RESOLVED
    grievance.resolution_notes = payload.get("resolution_notes")
    grievance.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(grievance)
    create_notification(
        db,
        user_id=current_user.id,
        title="Grievance resolved",
        message=f"Grievance #{grievance.id} has been resolved.",
        kind="success",
        link_path="/dbt/grievance",
        entity_type="grievance",
        entity_id=grievance.id,
    )
    return grievance


@router.get("/dashboard", response_model=DBTDashboardResponse)
async def dbt_dashboard(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    cases = db.query(DBTCase).all()
    grievances = db.query(GrievanceTicket).all()
    total_disbursed = sum(case.disbursed_amount or 0 for case in cases)
    pending_cases = sum(1 for case in cases if case.status in {DBTStatus.REGISTERED, DBTStatus.UNDER_REVIEW})
    resolved_grievances = sum(1 for grievance in grievances if grievance.status == GrievanceStatus.RESOLVED)
    average_time_to_disburse = 0.0
    by_state = {}
    by_case_type = {}
    if cases:
        for case in cases:
            victim = case.victim
            if victim:
                by_state[victim.state] = by_state.get(victim.state, 0) + 1
                by_case_type[victim.case_type.value] = by_case_type.get(victim.case_type.value, 0) + 1
        durations = []
        for case in cases:
            if case.disbursements:
                durations.append((case.disbursements[-1].disbursed_at - case.created_at).total_seconds() / 86400.0)
        average_time_to_disburse = round(sum(durations) / len(durations), 2) if durations else 0.0
    return DBTDashboardResponse(
        total_cases=len(cases),
        total_disbursed=round(total_disbursed, 2),
        pending_cases=pending_cases,
        average_time_to_disburse=average_time_to_disburse,
        grievance_resolution_rate=round((resolved_grievances / len(grievances) * 100), 2) if grievances else 0.0,
        by_state=by_state,
        by_case_type=by_case_type,
    )
