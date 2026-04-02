"""
Village gap identification models
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

class InfrastructureCategory(str, enum.Enum):
    """Infrastructure category enumeration"""
    EDUCATION = "education"
    HEALTHCARE = "healthcare"
    SANITATION = "sanitation"
    CONNECTIVITY = "connectivity"
    WATER = "water"
    ELECTRICITY = "electricity"
    SKILL = "skill"
    LIVELIHOOD = "livelihood"

class InfrastructureStatus(str, enum.Enum):
    """Infrastructure status enumeration"""
    PRESENT = "present"
    ABSENT = "absent"
    UNDER_CONSTRUCTION = "under_construction"
    DEGRADED = "degraded"

class Village(Base):
    """Village model for Adarsh Gram program"""
    __tablename__ = "villages"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    district = Column(String(50), nullable=False)
    block = Column(String(50), nullable=False)
    sc_population_pct = Column(Float, nullable=False)  # SC population percentage
    total_population = Column(Integer, nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    is_adarsh_gram = Column(Boolean, default=False)
    declared_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    infrastructure_items = relationship("InfrastructureItem", back_populates="village")
    gap_reports = relationship("GapReport", back_populates="village")

class InfrastructureItem(Base):
    """Infrastructure item for villages"""
    __tablename__ = "infrastructure_items"
    
    id = Column(Integer, primary_key=True, index=True)
    village_id = Column(Integer, ForeignKey("villages.id"), nullable=False)
    category = Column(Enum(InfrastructureCategory), nullable=False)
    item_name = Column(String(200), nullable=False)
    status = Column(Enum(InfrastructureStatus), nullable=False)
    last_verified = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)
    
    # Relationships
    village = relationship("Village", back_populates="infrastructure_items")

class GapReport(Base):
    """Gap analysis report for villages"""
    __tablename__ = "gap_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    village_id = Column(Integer, ForeignKey("villages.id"), nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    gap_score = Column(Float, nullable=False)  # 0-100
    priority_rank = Column(Integer, nullable=True)
    gap_summary = Column(JSON, nullable=True)  # {category: gap_count}
    recommended_interventions = Column(JSON, nullable=True)  # list of strings
    last_updated = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    village = relationship("Village", back_populates="gap_reports")