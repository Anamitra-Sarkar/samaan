"""
PM-AJAY agency mapping models
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

class AgencyType(str, enum.Enum):
    """Agency type enumeration"""
    STATE_GOVERNMENT = "state_government"
    CENTRAL_MINISTRY = "central_ministry"
    EXECUTING_AGENCY = "executing_agency"
    FINANCIAL_INSTITUTION = "financial_institution"
    NGO = "ngo"

class AgencyRole(str, enum.Enum):
    """Agency role in PM-AJAY"""
    IMPLEMENTING = "implementing"
    EXECUTING = "executing"
    MONITORING = "monitoring"
    FUNDING = "funding"

class MilestoneStatus(str, enum.Enum):
    """Project milestone status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DELAYED = "delayed"

class PMSAJAYComponent(str, enum.Enum):
    """PM-AJAY components"""
    ADARSH_GRAM = "adarsh_gram"
    GRANT_IN_AID = "grant_in_aid"
    HOSTEL = "hostel"

class Agency(Base):
    """Agency model"""
    __tablename__ = "agencies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    type = Column(Enum(AgencyType), nullable=False)
    state = Column(String(50), nullable=True)
    contact_email = Column(String(100), nullable=True)
    contact_phone = Column(String(15), nullable=True)
    head_name = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    agency_mappings = relationship("AgencyMapping", back_populates="agency")
    loan_records = relationship("LoanRecord", back_populates="agency")

class AgencyMapping(Base):
    """Agency-component mapping"""
    __tablename__ = "agency_mappings"
    
    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=False)
    component_id = Column(Integer, ForeignKey("pm_ajay_components.id"), nullable=False)
    role = Column(Enum(AgencyRole), nullable=False)
    state = Column(String(50), nullable=False)
    assigned_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), default="active")  # active/inactive
    notes = Column(Text, nullable=True)
    
    # Relationships
    agency = relationship("Agency", back_populates="agency_mappings")
    component = relationship("PMSAJAYComponent", back_populates="agency_mappings")
    fund_allocations = relationship("FundAllocation", back_populates="mapping")
    project_milestones = relationship("ProjectMilestone", back_populates="mapping")

class PMSAJAYComponent(Base):
    """PM-AJAY component reference"""
    __tablename__ = "pm_ajay_components"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(Enum(PMSAJAYComponent), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    
    # Relationships
    agency_mappings = relationship("AgencyMapping", back_populates="component")

class FundAllocation(Base):
    """Fund allocation tracking"""
    __tablename__ = "fund_allocations"
    
    id = Column(Integer, primary_key=True, index=True)
    mapping_id = Column(Integer, ForeignKey("agency_mappings.id"), nullable=False)
    total_allocated = Column(Float, nullable=False)
    total_released = Column(Float, default=0.0)
    total_utilized = Column(Float, default=0.0)
    financial_year = Column(String(9), nullable=False)  # Format: 2023-2024
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    mapping = relationship("AgencyMapping", back_populates="fund_allocations")

class ProjectMilestone(Base):
    """Project milestone tracking"""
    __tablename__ = "project_milestones"
    
    id = Column(Integer, primary_key=True, index=True)
    mapping_id = Column(Integer, ForeignKey("agency_mappings.id"), nullable=False)
    milestone_name = Column(String(200), nullable=False)
    target_date = Column(DateTime(timezone=True), nullable=False)
    completion_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(MilestoneStatus), default=MilestoneStatus.PENDING)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    mapping = relationship("AgencyMapping", back_populates="project_milestones")