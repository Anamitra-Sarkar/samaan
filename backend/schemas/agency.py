"""
Agency mapping schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from models.agency import AgencyType, AgencyRole, MilestoneStatus, PMSAJAYComponent

class AgencyCreate(BaseModel):
    """Schema for agency creation"""
    name: str = Field(..., max_length=200)
    type: AgencyType
    state: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    head_name: Optional[str] = None
    address: Optional[str] = None

class AgencyResponse(BaseModel):
    """Schema for agency response"""
    id: int
    name: str
    type: AgencyType
    state: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    head_name: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class AgencyMappingCreate(BaseModel):
    """Schema for agency mapping creation"""
    agency_id: int
    component_id: int
    role: AgencyRole
    state: str = Field(..., max_length=50)
    notes: Optional[str] = None

class AgencyMappingResponse(BaseModel):
    """Schema for agency mapping response"""
    id: int
    agency_id: int
    component_id: int
    role: AgencyRole
    state: str
    assigned_date: datetime
    status: str
    notes: Optional[str]
    
    class Config:
        from_attributes = True

class FundAllocationCreate(BaseModel):
    """Schema for fund allocation"""
    mapping_id: int
    total_allocated: float = Field(..., gt=0)
    financial_year: str = Field(..., pattern=r"^\d{4}-\d{4}$")

class FundAllocationResponse(BaseModel):
    """Schema for fund allocation response"""
    id: int
    mapping_id: int
    total_allocated: float
    total_released: float
    total_utilized: float
    financial_year: str
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProjectMilestoneCreate(BaseModel):
    """Schema for project milestone creation"""
    mapping_id: int
    milestone_name: str = Field(..., max_length=200)
    target_date: datetime
    remarks: Optional[str] = None

class ProjectMilestoneResponse(BaseModel):
    """Schema for project milestone response"""
    id: int
    mapping_id: int
    milestone_name: str
    target_date: datetime
    completion_date: Optional[datetime]
    status: MilestoneStatus
    remarks: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class AgencyDashboardResponse(BaseModel):
    """Schema for agency dashboard"""
    total_agencies: int
    total_mappings: int
    fund_utilization_rate: float
    pending_milestones: int
    by_component: Dict[str, int]
    by_state: Dict[str, int]
    
    class Config:
        from_attributes = True
