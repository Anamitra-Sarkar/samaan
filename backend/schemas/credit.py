"""
Credit scoring schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from models.credit import RiskBand

class ConsumptionDataCreate(BaseModel):
    """Schema for consumption data submission"""
    electricity_units_monthly: Optional[float] = None
    mobile_recharge_monthly_avg: Optional[float] = None
    utility_bill_avg: Optional[float] = None
    govt_survey_income_band: Optional[str] = Field(None, regex="^[A-D]$")
    additional_notes: Optional[str] = None

class ConsumptionDataResponse(BaseModel):
    """Schema for consumption data response"""
    id: int
    beneficiary_id: int
    electricity_units_monthly: Optional[float]
    mobile_recharge_monthly_avg: Optional[float]
    utility_bill_avg: Optional[float]
    govt_survey_income_band: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class CreditScoreResponse(BaseModel):
    """Schema for credit score response"""
    id: int
    beneficiary_id: int
    composite_score: float
    repayment_sub_score: float
    income_sub_score: float
    risk_band: RiskBand
    score_explanation: Optional[Dict]
    model_version: str
    scored_at: datetime
    
    class Config:
        from_attributes = True

class LendingApplicationCreate(BaseModel):
    """Schema for lending application"""
    requested_amount: float = Field(..., gt=0)
    purpose: str = Field(..., max_length=255)
    tenure_months: int = Field(..., gt=0, le=120)

class LendingApplicationResponse(BaseModel):
    """Schema for lending application response"""
    id: int
    beneficiary_id: int
    requested_amount: float
    purpose: str
    tenure_months: int
    status: str
    approved_amount: Optional[float]
    approval_notes: Optional[str]
    rejection_reason: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class LendingDecision(BaseModel):
    """Schema for lending decision"""
    decision: str = Field(..., regex="^(approve|reject)$")
    amount: Optional[float] = None
    notes: Optional[str] = None

class CreditDashboardResponse(BaseModel):
    """Schema for credit dashboard"""
    total_beneficiaries: int
    average_score: float
    risk_band_distribution: Dict[str, int]
    pending_applications: int
    approved_applications: int
    
    class Config:
        from_attributes = True