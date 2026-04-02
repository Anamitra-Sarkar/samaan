"""
Loan tracking schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from models.loan import LoanStatus, LoanProofValidationStatus

class LoanRecordCreate(BaseModel):
    """Schema for creating loan record"""
    beneficiary_id: int
    state_agency_id: Optional[int] = None
    loan_amount: float = Field(..., gt=0)
    loan_purpose: str = Field(..., max_length=255)
    asset_description: Optional[str] = None
    repayment_schedule: Optional[str] = None
    interest_rate: Optional[float] = None

class LoanRecordResponse(BaseModel):
    """Schema for loan record response"""
    id: int
    beneficiary_id: int
    state_agency_id: Optional[int]
    loan_amount: float
    loan_purpose: str
    loan_date: datetime
    loan_status: LoanStatus
    asset_description: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class LoanProofUpload(BaseModel):
    """Schema for loan proof upload"""
    loan_id: int
    geolat: Optional[float] = None
    geolng: Optional[float] = None

class LoanProofResponse(BaseModel):
    """Schema for loan proof response"""
    id: int
    loan_id: int
    beneficiary_id: int
    file_path: str
    file_type: str
    original_filename: str
    geolat: Optional[float]
    geolng: Optional[float]
    timestamp: datetime
    ai_validation_status: LoanProofValidationStatus
    ai_confidence_score: Optional[float]
    ai_remarks: Optional[str]
    reviewer_decision: Optional[str]
    review_notes: Optional[str]
    synced: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProofReview(BaseModel):
    """Schema for proof review"""
    decision: str = Field(..., pattern="^(approve|reject)$")
    notes: Optional[str] = None

class BulkSyncProof(BaseModel):
    """Schema for bulk sync of proofs"""
    proofs: List[dict]

class LoanStatsResponse(BaseModel):
    """Schema for loan statistics"""
    total_submissions: int
    active_loans: int
    ai_approved_percentage: float
    manually_reviewed_percentage: float
    fraud_flags: int
    pending_reviews: int
    by_status: dict
    by_state: dict
    monthly_submissions: list[dict]
    
    class Config:
        from_attributes = True
