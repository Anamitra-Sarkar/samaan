"""
Credit scoring models
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Enum, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

class RiskBand(str, enum.Enum):
    """Credit risk band enumeration"""
    LOW_RISK_HIGH_NEED = "LOW_RISK_HIGH_NEED"
    LOW_RISK_LOW_NEED = "LOW_RISK_LOW_NEED"
    HIGH_RISK_HIGH_NEED = "HIGH_RISK_HIGH_NEED"
    HIGH_RISK_LOW_NEED = "HIGH_RISK_LOW_NEED"

class ConsumptionData(Base):
    """Consumption data for income proxy calculation"""
    __tablename__ = "consumption_data"
    
    id = Column(Integer, primary_key=True, index=True)
    beneficiary_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    electricity_units_monthly = Column(Float, nullable=True)
    mobile_recharge_monthly_avg = Column(Float, nullable=True)
    utility_bill_avg = Column(Float, nullable=True)
    govt_survey_income_band = Column(String(1), nullable=True)  # A/B/C/D
    additional_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    beneficiary = relationship("User", back_populates="consumption_data")

class LoanRepaymentSummary(Base):
    """Loan repayment history summary"""
    __tablename__ = "loan_repayment_summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    beneficiary_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    total_loans = Column(Integer, default=0)
    on_time_payments = Column(Integer, default=0)
    delayed_payments = Column(Integer, default=0)
    defaults = Column(Integer, default=0)
    avg_loan_amount = Column(Float, default=0.0)
    total_amount_repaid = Column(Float, default=0.0)
    total_amount_defaulted = Column(Float, default=0.0)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    beneficiary = relationship("User")

class CreditScore(Base):
    """Credit score model with ML predictions"""
    __tablename__ = "credit_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    beneficiary_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    composite_score = Column(Float, nullable=False)  # 0-100
    repayment_sub_score = Column(Float, nullable=False)
    income_sub_score = Column(Float, nullable=False)
    risk_band = Column(Enum(RiskBand), nullable=False)
    score_explanation = Column(JSON, nullable=True)  # SHAP explanation
    model_version = Column(String(20), default="1.0.0")
    scored_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    beneficiary = relationship("User", back_populates="credit_scores")

class LendingApplication(Base):
    """Digital lending applications"""
    __tablename__ = "lending_applications"
    
    id = Column(Integer, primary_key=True, index=True)
    beneficiary_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    requested_amount = Column(Float, nullable=False)
    purpose = Column(String(255), nullable=False)
    tenure_months = Column(Integer, nullable=False)
    status = Column(String(20), default="pending")  # pending/approved/rejected
    approved_amount = Column(Float, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approval_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    beneficiary = relationship("User", foreign_keys=[beneficiary_id])
    approver = relationship("User", foreign_keys=[approved_by])
