"""
Loan tracking models
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

class LoanStatus(str, enum.Enum):
    """Loan status enumeration"""
    ACTIVE = "active"
    CLOSED = "closed"
    DEFAULTED = "defaulted"
    PENDING = "pending"

class LoanProofValidationStatus(str, enum.Enum):
    """AI validation status for loan proofs"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    MANUAL_REVIEW = "manual_review"

class LoanRecord(Base):
    """Loan record model"""
    __tablename__ = "loan_records"
    
    id = Column(Integer, primary_key=True, index=True)
    beneficiary_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    state_agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=True)
    loan_amount = Column(Float, nullable=False)
    loan_purpose = Column(String(255), nullable=False)
    loan_date = Column(DateTime(timezone=True), server_default=func.now())
    loan_status = Column(Enum(LoanStatus), default=LoanStatus.ACTIVE)
    asset_description = Column(Text, nullable=True)
    repayment_schedule = Column(String(50), nullable=True)  # monthly/quarterly/yearly
    interest_rate = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    beneficiary = relationship("User", back_populates="loan_records")
    agency = relationship("Agency", back_populates="loan_records")
    proofs = relationship("LoanProof", back_populates="loan_record")

class LoanProof(Base):
    """Loan proof with photo/video upload"""
    __tablename__ = "loan_proofs"
    
    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loan_records.id"), nullable=False)
    beneficiary_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=False)  # image/jpeg, image/png, video/mp4
    original_filename = Column(String(255), nullable=False)
    geolat = Column(Float, nullable=True)
    geolng = Column(Float, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    ai_validation_status = Column(Enum(LoanProofValidationStatus), default=LoanProofValidationStatus.PENDING)
    ai_confidence_score = Column(Float, nullable=True)
    ai_remarks = Column(Text, nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_decision = Column(String(20), nullable=True)  # approve/reject
    review_notes = Column(Text, nullable=True)
    synced = Column(Boolean, default=False)  # For offline sync
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    loan_record = relationship("LoanRecord", back_populates="proofs")
    beneficiary = relationship("User", back_populates="loan_proofs")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="review_decisions")