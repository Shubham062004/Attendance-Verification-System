from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    actor_id: int | None = None
    actor_name: str | None = None
    actor_role: str | None = None
    action_type: str
    entity_type: str | None = None
    entity_id: int | None = None
    description: str
    metadata_json: dict[str, Any] | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogPaginatedResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    size: int
