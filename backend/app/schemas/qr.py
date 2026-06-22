from datetime import datetime

from pydantic import BaseModel, ConfigDict


class QRValidateRequest(BaseModel):
    token: str


class QRValidateResponse(BaseModel):
    valid: bool
    session_id: int | None = None
    session_title: str | None = None
    subject: str | None = None
    class_name: str | None = None
    teacher_name: str | None = None


class QRTokenResponse(BaseModel):
    token: str
    expires_at: datetime
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
