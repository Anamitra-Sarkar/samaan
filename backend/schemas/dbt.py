"""
DBT tracking schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from models.dbt import CaseType, AssistanceType, DBTStatus, GrievanceCategory, GrievanceStatus

class VictimCreate(BaseModel):
    """Schema for victim registration"""
    name: str = Field(..., max_length=100)
    aadhaar_last4: Optional[str] = Field(None, min_length=4, max_length=4)
    mobile: str = Field(..., min_length=10, max_length=10)
    state: str = Field(..., max_length=50)
    district: str = Field(..., max_length=50)
    case_type: CaseType
    fir_number: str = Field(..., max_length=50)
    court_case_number: Optional[str] = None
    incident_date: datetime

class VictimResponse(BaseModel):
    """Schema for victim response"""
    id: int
    name: str
    aadhaar_last4: Optional[str]
    mobile: str
    state: str
    district: str
    case_type: CaseType
    fir_number: str
    verification_status: str
    digilocker_verified: bool
    cctns_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class DBTCaseCreate(BaseModel):
    """Schema for DBT case creation"""
    victim_id: int
    assistance_type: AssistanceType
    approved_amount: float = Field(..., gt=0)

class DBTCaseResponse(BaseModel):
    """Schema for DBT case response"""
    id: int
    victim_id: int
    assistance_type: AssistanceType
    approved_amount: float
    disbursed_amount: float
    status: DBTStatus
    assigned_officer_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class DisbursementCreate(BaseModel):
    """Schema for disbursement creation"""
    case_id: int
    amount: float = Field(..., gt=0)
    bank_account_last4: Optional[str] = None
    remarks: Optional[str] = None

class DisbursementResponse(BaseModel):
    """Schema for disbursement response"""
    id: int
    case_id: int
    amount: float
    disbursed_at: datetime
    transaction_ref: str
    bank_account_last4: Optional[str]
    remarks: Optional[str]
    
    class Config:
        from_attributes = True

class GrievanceCreate(BaseModel):
    """Schema for grievance creation"""
    case_id: Optional[int] = None
    victim_id: Optional[int] = None
    category: GrievanceCategory
    description: str

class GrievanceResponse(BaseModel):
    """Schema for grievance response"""
    id: int
    case_id: Optional[int]
    victim_id: Optional[int]
    category: GrievanceCategory
    description: str
    status: GrievanceStatus
    created_at: datetime
    resolution_notes: Optional[str]
    resolved_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class DBTTimelineItem(BaseModel):
    """Schema for timeline item"""
    step: str
    timestamp: datetime
    status: str
    notes: Optional[str]
    performed_by: Optional[str]

class DBTTimelineResponse(BaseModel):
    """Schema for timeline response"""
    case_id: int
    timeline: List[DBTTimelineItem]

class DBTDashboardResponse(BaseModel):
    """Schema for DBT dashboard"""
    total_cases: int
    total_disbursed: float
    pending_cases: int
    average_time_to_disburse: float  # in days
    grievance_resolution_rate: float
    by_state: Dict[str, int]
    by_case_type: Dict[str, int]
    
    class Config:
        from_attributes = True