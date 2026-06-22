from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserBase(BaseModel):
    email: str
    name: str | None = None
    role: str
    is_active: bool = True
    registration_number: str | None = None


class UserCreate(UserBase):
    google_id: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None


class StudentRegister(BaseModel):
    registration_number: str = Field(..., min_length=2, description="Student registration number")


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
