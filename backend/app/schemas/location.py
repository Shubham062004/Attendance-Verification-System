from datetime import datetime

from pydantic import BaseModel, Field


class ClassroomLocationBase(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude of classroom center")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude of classroom center")
    allowed_radius: float = Field(100.0, gt=0, description="Allowed radius in meters")


class ClassroomLocationCreate(ClassroomLocationBase):
    pass


class ClassroomLocationUpdate(ClassroomLocationBase):
    pass


class ClassroomLocationResponse(ClassroomLocationBase):
    id: int
    session_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class LocationValidationRequest(BaseModel):
    session_id: int = Field(..., description="ID of the attendance session")
    latitude: float | None = Field(None, ge=-90, le=90, description="Student latitude (None if denied)")
    longitude: float | None = Field(None, ge=-180, le=180, description="Student longitude (None if denied)")
    accuracy: float | None = Field(None, ge=0, description="GPS accuracy in meters")


class LocationValidationResponse(BaseModel):
    id: int
    student_id: int
    session_id: int
    latitude: float | None = None
    longitude: float | None = None
    accuracy: float | None = None
    distance_from_center: float | None = None
    is_within_radius: bool
    risk_score: int
    created_at: datetime

    class Config:
        from_attributes = True
