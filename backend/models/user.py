"""
User models for SAMAAN platform
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

class UserRole(str, enum.Enum):
    """User roles enumeration"""
    BENEFICIARY = "beneficiary"
    STATE_OFFICER = "state_officer"
    BANK_OFFICER = "bank_officer"
    ADMIN = "admin"

class User(Base):
    """User model for authentication"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    mobile = Column(String(10), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.BENEFICIARY)
    state = Column(String(50), nullable=True)
    district = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    loan_proofs = relationship("LoanProof", foreign_keys="LoanProof.beneficiary_id", back_populates="beneficiary")
    credit_scores = relationship("CreditScore", back_populates="beneficiary")
    consumption_data = relationship("ConsumptionData", back_populates="beneficiary")
    loan_records = relationship("LoanRecord", back_populates="beneficiary")
    review_decisions = relationship("LoanProof", foreign_keys="LoanProof.reviewer_id", back_populates="reviewer")
    dbt_cases_assigned = relationship("DBTCase", foreign_keys="DBTCase.assigned_officer_id", back_populates="assigned_officer")

class BeneficiaryProfile(Base):
    """Extended profile for beneficiaries"""
    __tablename__ = "beneficiary_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    aadhaar_last4 = Column(String(4), nullable=True)
    caste_category = Column(String(50), nullable=True)  # SC/ST/OBC/General
    annual_income_estimate = Column(Integer, nullable=True)
    family_size = Column(Integer, nullable=True)
    occupation = Column(String(100), nullable=True)
    bank_account_last4 = Column(String(4), nullable=True)
    bank_name = Column(String(100), nullable=True)
    ifsc_code = Column(String(11), nullable=True)
    address = Column(String(500), nullable=True)
    pincode = Column(String(6), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="profile")
    
User.profile = relationship("BeneficiaryProfile", back_populates="user", uselist=False)
