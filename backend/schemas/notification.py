"""
Notification schemas
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    id: int
    kind: str
    title: str
    message: str
    link_path: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationsFeedResponse(BaseModel):
    items: list[NotificationResponse]
    unread_count: int

