"""
DBT under PCR/PoA Acts models
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

class CaseType(str, enum.Enum):
    """Case type enumeration"""
    PCR = "pcr"  # Protection of Civil Rights
    POA = "poa"  # Prevention of Atrocities

class VerificationStatus(str, enum.Enum):
    """Verification status"""
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"

class AssistanceType(str, enum.Enum):
    """Assistance type enumeration"""
    RELIEF = "relief"
    REHABILITATION = "rehabilitation"
    INTER_CASTE_MARRIAGE_INCENTIVE = "inter_caste_marriage_incentive"

class DBTStatus(str, enum.Enum):
    """DBT case status"""
    REGISTERED = "registered"
    UNDER_REVIEW = "under_review"
    SANCTIONED = "sanctioned"
    DISBURSED = "disbursed"
    CLOSED = "closed"

class GrievanceCategory(str, enum.Enum):
    """Grievance categories"""
    DELAY = "delay"
    WRONG_AMOUNT = "wrong_amount"
    HARASSMENT = "harassment"
    OTHER = "other"

class GrievanceStatus(str, enum.Enum):
    """Grievance status"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"

class Victim(Base):
    """Victim registration"""
    __tablename__ = "victims"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    aadhaar_last4 = Column(String(4), nullable=True)
    mobile = Column(String(10), nullable=False)
    state = Column(String(50), nullable=False)
    district = Column(String(50), nullable=False)
    case_type = Column(Enum(CaseType), nullable=False)
    fir_number = Column(String(50), nullable=False)
    court_case_number = Column(String(50), nullable=True)
    incident_date = Column(DateTime(timezone=True), nullable=False)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING)
    digilocker_verified = Column(Boolean, default=False)
    cctns_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    dbt_cases = relationship("DBTCase", back_populates="victim")
    grievances = relationship("GrievanceTicket", back_populates="victim")

class DBTCase(Base):
    """DBT case for victims"""
    __tablename__ = "dbt_cases"
    
    id = Column(Integer, primary_key=True, index=True)
    victim_id = Column(Integer, ForeignKey("victims.id"), nullable=False)
    assistance_type = Column(Enum(AssistanceType), nullable=False)
    approved_amount = Column(Float, nullable=False)
    disbursed_amount = Column(Float, default=0.0)
    status = Column(Enum(DBTStatus), default=DBTStatus.REGISTERED)
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    victim = relationship("Victim", back_populates="dbt_cases")
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id], back_populates="dbt_cases_assigned")
    disbursements = relationship("Disbursement", back_populates="dbt_case")
    grievances = relationship("GrievanceTicket", back_populates="dbt_case")

class Disbursement(Base):
    """Disbursement records"""
    __tablename__ = "disbursements"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("dbt_cases.id"), nullable=False)
    amount = Column(Float, nullable=False)
    disbursed_at = Column(DateTime(timezone=True), server_default=func.now())
    transaction_ref = Column(String(50), nullable=False)
    bank_account_last4 = Column(String(4), nullable=True)
    remarks = Column(Text, nullable=True)
    
    # Relationships
    dbt_case = relationship("DBTCase", back_populates="disbursements")

class GrievanceTicket(Base):
    """Grievance tickets"""
    __tablename__ = "grievance_tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("dbt_cases.id"), nullable=True)
    victim_id = Column(Integer, ForeignKey("victims.id"), nullable=True)
    category = Column(Enum(GrievanceCategory), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(GrievanceStatus), default=GrievanceStatus.OPEN)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    dbt_case = relationship("DBTCase", back_populates="grievances")
    victim = relationship("Victim", back_populates="grievances")