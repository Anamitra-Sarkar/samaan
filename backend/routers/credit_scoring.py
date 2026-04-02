from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from database import get_db
from models.user import User, UserRole
from models.credit import ConsumptionData, LoanRepaymentSummary, CreditScore, LendingApplication, RiskBand
from schemas.credit import (
    ConsumptionDataCreate,
    ConsumptionDataResponse,
    CreditScoreResponse,
    LendingApplicationCreate,
    LendingApplicationResponse,
    LendingDecision,
    CreditDashboardResponse,
)
from routers.auth import get_current_active_user, verify_role
from ml.credit_model import compute_composite_score, build_feature_vector, get_credit_model
from ml.shap_explainer import explain_features

router = APIRouter()


def _ensure_summary(db: Session, beneficiary_id: int) -> LoanRepaymentSummary:
    summary = db.query(LoanRepaymentSummary).filter(LoanRepaymentSummary.beneficiary_id == beneficiary_id).first()
    if summary is None:
        summary = LoanRepaymentSummary(beneficiary_id=beneficiary_id)
        db.add(summary)
        db.commit()
        db.refresh(summary)
    return summary


@router.post("/consumption", response_model=ConsumptionDataResponse)
async def submit_consumption_data(
    payload: ConsumptionDataCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    verify_role(current_user, [UserRole.BENEFICIARY, UserRole.ADMIN])
    existing = db.query(ConsumptionData).filter(ConsumptionData.beneficiary_id == current_user.id).first()
    if existing is None:
        existing = ConsumptionData(beneficiary_id=current_user.id)
        db.add(existing)
    existing.electricity_units_monthly = payload.electricity_units_monthly
    existing.mobile_recharge_monthly_avg = payload.mobile_recharge_monthly_avg
    existing.utility_bill_avg = payload.utility_bill_avg
    existing.govt_survey_income_band = payload.govt_survey_income_band
    if hasattr(existing, "additional_notes"):
        existing.additional_notes = payload.additional_notes
    db.commit()
    db.refresh(existing)
    return existing


@router.get("/score/{beneficiary_id}", response_model=CreditScoreResponse)
async def get_latest_credit_score(
    beneficiary_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role == UserRole.BENEFICIARY and current_user.id != beneficiary_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view another beneficiary's score")
    score = (
        db.query(CreditScore)
        .filter(CreditScore.beneficiary_id == beneficiary_id)
        .order_by(desc(CreditScore.scored_at))
        .first()
    )
    if score is None:
        score = await _rescore_beneficiary(beneficiary_id, db)
    return score


async def _rescore_beneficiary(beneficiary_id: int, db: Session) -> CreditScore:
    summary = _ensure_summary(db, beneficiary_id)
    consumption = db.query(ConsumptionData).filter(ConsumptionData.beneficiary_id == beneficiary_id).order_by(desc(ConsumptionData.created_at)).first()
    if consumption is None:
        consumption = ConsumptionData(beneficiary_id=beneficiary_id)
        db.add(consumption)
        db.commit()
        db.refresh(consumption)

    composite, risk_band, explanation = compute_composite_score(summary, consumption)
    repayment_rate = summary.on_time_payments / max(summary.total_loans or 1, 1)
    income_score = float(explanation["top_features"][1]["impact"]) * 100 if explanation.get("top_features") else 50.0

    score = CreditScore(
        beneficiary_id=beneficiary_id,
        composite_score=composite,
        repayment_sub_score=round(repayment_rate * 100, 2),
        income_sub_score=round(income_score, 2),
        risk_band=risk_band,
        score_explanation=explain_features(build_feature_vector(summary, consumption), composite, risk_band.value),
        model_version="1.0.0",
    )
    db.add(score)
    db.commit()
    db.refresh(score)
    return score


@router.post("/rescore/{beneficiary_id}", response_model=CreditScoreResponse)
async def rescore_beneficiary(
    beneficiary_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role == UserRole.BENEFICIARY and current_user.id != beneficiary_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot rescore another beneficiary")
    return await _rescore_beneficiary(beneficiary_id, db)


@router.get("/dashboard", response_model=CreditDashboardResponse)
async def credit_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    scores = db.query(CreditScore).all()
    score_values = [score.composite_score for score in scores]
    distribution = Counter(score.risk_band.value for score in scores)
    pending_applications = db.query(func.count(LendingApplication.id)).filter(LendingApplication.status == "pending").scalar() or 0
    approved_applications = db.query(func.count(LendingApplication.id)).filter(LendingApplication.status == "approved").scalar() or 0
    return CreditDashboardResponse(
        total_beneficiaries=db.query(func.count(ConsumptionData.beneficiary_id.distinct())).scalar() or 0,
        average_score=round(sum(score_values) / len(score_values), 2) if score_values else 0.0,
        risk_band_distribution={band.value: distribution.get(band.value, 0) for band in RiskBand},
        pending_applications=pending_applications,
        approved_applications=approved_applications,
    )


@router.get("/beneficiaries")
async def list_scored_beneficiaries(
    skip: int = 0,
    limit: int = 25,
    risk_band: Optional[RiskBand] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    verify_role(current_user, [UserRole.BANK_OFFICER, UserRole.ADMIN, UserRole.STATE_OFFICER])
    query = db.query(CreditScore).order_by(desc(CreditScore.scored_at))
    if risk_band:
        query = query.filter(CreditScore.risk_band == risk_band)
    items = query.offset(skip).limit(limit).all()
    return {
        "items": [CreditScoreResponse.model_validate(item).model_dump() for item in items],
        "total": query.count(),
    }


@router.post("/lending/apply", response_model=LendingApplicationResponse)
async def apply_for_lending(
    payload: LendingApplicationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    verify_role(current_user, [UserRole.BENEFICIARY, UserRole.ADMIN])
    latest = db.query(CreditScore).filter(CreditScore.beneficiary_id == current_user.id).order_by(desc(CreditScore.scored_at)).first()
    if latest is None:
        latest = await _rescore_beneficiary(current_user.id, db)
    if latest.risk_band != RiskBand.LOW_RISK_HIGH_NEED and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only LOW_RISK_HIGH_NEED beneficiaries can apply")
    application = LendingApplication(
        beneficiary_id=current_user.id,
        requested_amount=payload.requested_amount,
        purpose=payload.purpose,
        tenure_months=payload.tenure_months,
        status="pending",
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.get("/lending/applications", response_model=list[LendingApplicationResponse])
async def lending_applications(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    verify_role(current_user, [UserRole.BANK_OFFICER, UserRole.ADMIN])
    return db.query(LendingApplication).order_by(desc(LendingApplication.created_at)).all()


@router.patch("/lending/{application_id}/decision", response_model=LendingApplicationResponse)
async def lending_decision(
    application_id: int,
    decision: LendingDecision,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    verify_role(current_user, [UserRole.BANK_OFFICER, UserRole.ADMIN])
    application = db.query(LendingApplication).filter(LendingApplication.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    latest = db.query(CreditScore).filter(CreditScore.beneficiary_id == application.beneficiary_id).order_by(desc(CreditScore.scored_at)).first()
    auto_approve = latest is not None and latest.composite_score >= 75
    if decision.decision == "approve" or auto_approve:
        application.status = "approved"
        application.approved_amount = decision.amount or application.requested_amount
        application.approval_notes = decision.notes or ("Auto-approved due to score >= 75" if auto_approve else "Approved")
        application.rejection_reason = None
    else:
        application.status = "rejected"
        application.rejection_reason = decision.notes or "Rejected by reviewer"
        application.approved_amount = None
        application.approval_notes = None
    db.commit()
    db.refresh(application)
    return application


@router.post("/seed-score/{beneficiary_id}", response_model=CreditScoreResponse)
async def seed_or_score_beneficiary(
    beneficiary_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    verify_role(current_user, [UserRole.ADMIN, UserRole.STATE_OFFICER, UserRole.BANK_OFFICER])
    return await _rescore_beneficiary(beneficiary_id, db)
