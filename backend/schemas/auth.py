"""
Authentication schemas
"""
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional
from datetime import datetime
from models.user import UserRole

class UserCreate(BaseModel):
    """Schema for user registration"""
    mobile: str = Field(..., min_length=10, max_length=10, description="10-digit mobile number")
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6)
    role: UserRole = Field(default=UserRole.BENEFICIARY)
    state: Optional[str] = None
    district: Optional[str] = None
    
    @validator('mobile')
    def validate_mobile(cls, v):
        if not v.isdigit():
            raise ValueError('Mobile number must contain only digits')
        return v

class UserLogin(BaseModel):
    """Schema for user login"""
    mobile: str = Field(..., min_length=10, max_length=10)
    password: str = Field(...)

class Token(BaseModel):
    """Schema for JWT token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str

class TokenData(BaseModel):
    """Schema for token payload"""
    user_id: int
    mobile: str
    role: UserRole

class UserResponse(BaseModel):
    """Schema for user response"""
    id: int
    mobile: str
    name: str
    role: UserRole
    state: Optional[str]
    district: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request"""
    refresh_token: str

class OTPRequest(BaseModel):
    """Schema for OTP request"""
    mobile: str
    
    @validator('mobile')
    def validate_mobile(cls, v):
        if not v.isdigit() or len(v) != 10:
            raise ValueError('Invalid mobile number')
        return v

class OTPVerify(BaseModel):
    """Schema for OTP verification"""
    mobile: str
    otp: str = Field(..., min_length=6, max_length=6)
