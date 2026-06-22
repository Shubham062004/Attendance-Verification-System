from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SessionBase(BaseModel):
    title: str = Field(..., min_length=1, description="Title of the session")
    subject: str = Field(..., min_length=1, description="Subject of the session")
    class_name: str = Field(..., min_length=1, description="Class or section name")
    description: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None


class SessionCreate(SessionBase):
    pass


class SessionUpdate(BaseModel):
    title: str | None = None
    subject: str | None = None
    class_name: str | None = None
    description: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None


class SessionResponse(SessionBase):
    id: int
    session_code: str | None = None
    status: str
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SessionStats(BaseModel):
    total: int
    active: int
    ended: int
    draft: int
