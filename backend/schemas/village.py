"""
Village gap schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from models.village import InfrastructureCategory, InfrastructureStatus

class VillageCreate(BaseModel):
    """Schema for village creation"""
    name: str = Field(..., max_length=100)
    state: str = Field(..., max_length=50)
    district: str = Field(..., max_length=50)
    block: str = Field(..., max_length=50)
    sc_population_pct: float = Field(..., ge=0, le=100)
    total_population: int = Field(..., gt=0)
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_adarsh_gram: bool = False

class VillageResponse(BaseModel):
    """Schema for village response"""
    id: int
    name: str
    state: str
    district: str
    block: str
    sc_population_pct: float
    total_population: int
    lat: Optional[float]
    lng: Optional[float]
    is_adarsh_gram: bool
    declared_date: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True

class InfrastructureItemCreate(BaseModel):
    """Schema for infrastructure item creation"""
    village_id: int
    category: InfrastructureCategory
    item_name: str = Field(..., max_length=200)
    status: InfrastructureStatus
    notes: Optional[str] = None

class InfrastructureItemResponse(BaseModel):
    """Schema for infrastructure item response"""
    id: int
    village_id: int
    category: InfrastructureCategory
    item_name: str
    status: InfrastructureStatus
    last_verified: datetime
    notes: Optional[str]
    
    class Config:
        from_attributes = True

class GapReportResponse(BaseModel):
    """Schema for gap report response"""
    id: int
    village_id: int
    generated_at: datetime
    gap_score: float
    priority_rank: Optional[int]
    gap_summary: Optional[Dict]
    recommended_interventions: Optional[List[str]]
    
    class Config:
        from_attributes = True

class VillageMapData(BaseModel):
    """Schema for village map data"""
    id: int
    name: str
    state: str
    district: str
    lat: Optional[float]
    lng: Optional[float]
    gap_score: float
    sc_population_pct: float
    total_population: int
    is_adarsh_gram: bool
    risk_color: str
    
    class Config:
        from_attributes = True

class VillageStatsResponse(BaseModel):
    """Schema for village statistics"""
    total_villages: int
    average_gap_score: float
    adarsh_gram_percentage: float
    total_sc_population: int
    by_state: Dict[str, int]
    
    class Config:
        from_attributes = True