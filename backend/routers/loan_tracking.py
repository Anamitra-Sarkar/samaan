"""
Loan tracking router
"""
import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from database import get_db
from models.user import User, UserRole
from models.loan import LoanRecord, LoanProof, LoanStatus, LoanProofValidationStatus
from schemas.loan import (
    LoanRecordCreate, LoanRecordResponse, LoanProofUpload,
    LoanProofResponse, ProofReview, BulkSyncProof, LoanStatsResponse
)
from routers.auth import get_current_active_user, verify_role
from ml.loan_ai_validator import validate_loan_proof
from utils.file_utils import save_uploaded_file

router = APIRouter()

@router.post("/enter-beneficiary", response_model=LoanRecordResponse)
async def enter_beneficiary_loan(
    loan_data: LoanRecordCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """State officer enters beneficiary loan data"""
    verify_role(current_user, [UserRole.STATE_OFFICER, UserRole.ADMIN])
    
    # Verify beneficiary exists
    beneficiary = db.query(User).filter(
        User.id == loan_data.beneficiary_id,
        User.role == UserRole.BENEFICIARY
    ).first()
    if not beneficiary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Beneficiary not found"
        )
    
    # Create loan record
    loan_record = LoanRecord(
        beneficiary_id=loan_data.beneficiary_id,
        state_agency_id=loan_data.state_agency_id,
        loan_amount=loan_data.loan_amount,
        loan_purpose=loan_data.loan_purpose,
        asset_description=loan_data.asset_description,
        repayment_schedule=loan_data.repayment_schedule,
        interest_rate=loan_data.interest_rate,
        loan_status=LoanStatus.ACTIVE
    )
    
    db.add(loan_record)
    db.commit()
    db.refresh(loan_record)
    
    return loan_record

@router.post("/upload-proof", response_model=LoanProofResponse)
async def upload_loan_proof(
    loan_id: int = Form(...),
    geolat: Optional[float] = Form(None),
    geolng: Optional[float] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload loan proof (photo/video) with geotag"""
    verify_role(current_user, [UserRole.BENEFICIARY, UserRole.ADMIN])
    
    # Verify loan exists and belongs to beneficiary
    loan_record = db.query(LoanRecord).filter(
        LoanRecord.id == loan_id,
        LoanRecord.beneficiary_id == current_user.id
    ).first()
    if not loan_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan record not found or access denied"
        )
    
    # Save uploaded file
    file_path, file_type, original_filename = save_uploaded_file(file)
    
    # Run AI validation
    validation_result = validate_loan_proof(file_path, geolat, geolng)
    
    # Create proof record
    loan_proof = LoanProof(
        loan_id=loan_id,
        beneficiary_id=current_user.id,
        file_path=file_path,
        file_type=file_type,
        original_filename=original_filename,
        geolat=geolat,
        geolng=geolng,
        ai_validation_status=validation_result["status"],
        ai_confidence_score=validation_result["confidence_score"],
        ai_remarks=validation_result["remarks"],
        synced=True
    )
    
    db.add(loan_proof)
    db.commit()
    db.refresh(loan_proof)
    
    return loan_proof

@router.get("/my-proofs", response_model=List[LoanProofResponse])
async def get_my_proofs(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get beneficiary's own proof submissions"""
    verify_role(current_user, [UserRole.BENEFICIARY, UserRole.ADMIN])
    
    proofs = db.query(LoanProof).filter(
        LoanProof.beneficiary_id == current_user.id
    ).order_by(desc(LoanProof.created_at)).offset(skip).limit(limit).all()
    
    return proofs

@router.get("/review-queue", response_model=List[LoanProofResponse])
async def get_review_queue(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    state: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Officer gets pending proofs for review"""
    verify_role(current_user, [UserRole.STATE_OFFICER, UserRole.ADMIN])
    
    query = db.query(LoanProof).join(User).join(LoanRecord).filter(
        LoanProof.ai_validation_status.in_([
            LoanProofValidationStatus.PENDING,
            LoanProofValidationStatus.MANUAL_REVIEW
        ]),
        LoanProof.reviewer_decision.is_(None)
    )
    
    if status:
        query = query.filter(LoanProof.ai_validation_status == status)
    
    if state and current_user.role == UserRole.ADMIN:
        query = query.filter(User.state == state)
    elif current_user.role == UserRole.STATE_OFFICER:
        query = query.filter(User.state == current_user.state)
    
    proofs = query.order_by(LoanProof.created_at).offset(skip).limit(limit).all()
    
    return proofs

@router.patch("/proof/{proof_id}/review")
async def review_proof(
    proof_id: int,
    review_data: ProofReview,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Officer reviews and approves/rejects proof"""
    verify_role(current_user, [UserRole.STATE_OFFICER, UserRole.ADMIN])
    
    proof = db.query(LoanProof).filter(LoanProof.id == proof_id).first()
    if not proof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proof not found"
        )
    
    proof.reviewer_id = current_user.id
    proof.reviewer_decision = review_data.decision
    proof.review_notes = review_data.notes
    
    db.commit()
    
    return {
        "message": "Review submitted successfully",
        "proof_id": proof_id,
        "decision": review_data.decision
    }

@router.get("/records", response_model=List[LoanRecordResponse])
async def get_loan_records(
    skip: int = 0,
    limit: int = 50,
    beneficiary_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get loan records (filterable)"""
    verify_role(current_user, [UserRole.STATE_OFFICER, UserRole.ADMIN])
    
    query = db.query(LoanRecord)
    
    if beneficiary_id:
        query = query.filter(LoanRecord.beneficiary_id == beneficiary_id)
    
    if status:
        query = query.filter(LoanRecord.loan_status == status)
    
    # State officers can only see records from their state
    if current_user.role == UserRole.STATE_OFFICER:
        query = query.join(User).filter(User.state == current_user.state)
    
    records = query.order_by(desc(LoanRecord.created_at)).offset(skip).limit(limit).all()
    
    return records

@router.post("/bulk-sync")
async def bulk_sync_proofs(
    sync_data: BulkSyncProof,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Bulk sync offline proof submissions"""
    verify_role(current_user, [UserRole.BENEFICIARY, UserRole.ADMIN])
    
    synced_count = 0
    failed_count = 0
    
    for proof_data in sync_data.proofs:
        try:
            # Validate and save proof
            loan_proof = LoanProof(
                loan_id=proof_data.get("loan_id"),
                beneficiary_id=current_user.id,
                file_path=proof_data.get("file_path"),
                file_type=proof_data.get("file_type"),
                original_filename=proof_data.get("original_filename"),
                geolat=proof_data.get("geolat"),
                geolng=proof_data.get("geolng"),
                timestamp=proof_data.get("timestamp"),
                ai_validation_status=LoanProofValidationStatus.PENDING,
                synced=True
            )
            
            db.add(loan_proof)
            synced_count += 1
        except Exception as e:
            failed_count += 1
    
    db.commit()
    
    return {
        "message": "Bulk sync completed",
        "synced": synced_count,
        "failed": failed_count,
        "total": len(sync_data.proofs)
    }

@router.get("/stats", response_model=LoanStatsResponse)
async def get_loan_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get loan tracking statistics"""
    # Total submissions
    total_submissions = db.query(func.count(LoanProof.id)).scalar() or 0

    active_loans = db.query(func.count(LoanRecord.id)).filter(LoanRecord.loan_status == LoanStatus.ACTIVE).scalar() or 0
    
    # AI approved percentage
    ai_approved = db.query(func.count(LoanProof.id)).filter(
        LoanProof.ai_validation_status == LoanProofValidationStatus.APPROVED
    ).scalar() or 0
    
    ai_approved_percentage = (
        (ai_approved / total_submissions * 100) if total_submissions > 0 else 0
    )
    
    # Manually reviewed percentage
    manually_reviewed = db.query(func.count(LoanProof.id)).filter(
        LoanProof.reviewer_decision.isnot(None)
    ).scalar() or 0
    
    manually_reviewed_percentage = (
        (manually_reviewed / total_submissions * 100) if total_submissions > 0 else 0
    )
    
    # Fraud flags (rejected by AI or officer)
    fraud_flags = db.query(func.count(LoanProof.id)).filter(
        (LoanProof.ai_validation_status == LoanProofValidationStatus.REJECTED) |
        (LoanProof.reviewer_decision == "reject")
    ).scalar() or 0
    
    # Pending reviews
    pending_reviews = db.query(func.count(LoanProof.id)).filter(
        LoanProof.ai_validation_status.in_([
            LoanProofValidationStatus.PENDING,
            LoanProofValidationStatus.MANUAL_REVIEW
        ]),
        LoanProof.reviewer_decision.is_(None)
    ).scalar() or 0
    
    # Stats by status
    by_status = {}
    for status in LoanProofValidationStatus:
        count = db.query(func.count(LoanProof.id)).filter(
            LoanProof.ai_validation_status == status
        ).scalar() or 0
        by_status[status.value] = count
    
    # Stats by state
    by_state_query = db.query(
        User.state,
        func.count(LoanProof.id)
    ).join(LoanProof.beneficiary).group_by(User.state).all()
    by_state = {state: count for state, count in by_state_query if state}

    monthly_query = db.query(
        func.strftime("%Y-%m", LoanRecord.loan_date),
        func.count(LoanRecord.id)
    ).group_by(func.strftime("%Y-%m", LoanRecord.loan_date)).order_by(func.strftime("%Y-%m", LoanRecord.loan_date)).all()
    monthly_submissions = [{"month": month, "submissions": count} for month, count in monthly_query if month]
    
    return LoanStatsResponse(
        total_submissions=total_submissions,
        active_loans=active_loans,
        ai_approved_percentage=ai_approved_percentage,
        manually_reviewed_percentage=manually_reviewed_percentage,
        fraud_flags=fraud_flags,
        pending_reviews=pending_reviews,
        by_status=by_status,
        by_state=by_state,
        monthly_submissions=monthly_submissions,
    )
