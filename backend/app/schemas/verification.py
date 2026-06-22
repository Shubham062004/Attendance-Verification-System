from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class VerificationStartRequest(BaseModel):
    session_id: int = Field(..., description="ID of the attendance session being verified")


class VerificationCompleteRequest(BaseModel):
    verification_id: int = Field(..., description="ID of the verification session to complete")
    camera_granted: bool = Field(False, description="Whether camera permission was granted")
    face_detected: bool = Field(False, description="Whether a single face was detected")
    blink_verified: bool = Field(False, description="Whether blink liveness was confirmed")
    smile_verified: bool = Field(False, description="Whether smile liveness was confirmed")
    failure_reason: str | None = Field(None, description="Optional textual reason for failure")


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class VerificationSessionResponse(BaseModel):
    id: int
    student_id: int
    session_id: int
    camera_granted: bool
    face_detected: bool
    blink_verified: bool
    smile_verified: bool
    liveness_passed: bool
    status: Literal["PENDING", "IN_PROGRESS", "PASSED", "FAILED", "SKIPPED"]
    failure_reason: str | None = None
    attempt_count: int
    started_at: datetime
    completed_at: datetime | None = None

    class Config:
        from_attributes = True
