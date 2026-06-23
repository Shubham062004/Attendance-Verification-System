from datetime import datetime

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Submission request
# ---------------------------------------------------------------------------

class AttendanceSubmitRequest(BaseModel):
    session_id: int = Field(..., description="Attendance session to mark attendance for")


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------

class AttendanceRecordResponse(BaseModel):
    id: int
    student_id: int
    session_id: int
    location_validation_id: int | None = None
    verification_session_id: int | None = None
    evidence_id: int | None = None
    status: str
    submitted_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class AttendanceSubmitResponse(BaseModel):
    """Richer response returned specifically on successful submission."""
    attendance_marked: bool
    status: str
    record_id: int
    session_id: int
    session_title: str
    session_subject: str
    session_class: str
    submitted_at: datetime


class SessionAttendanceSummary(BaseModel):
    """Admin-facing roll-up for a session's attendance."""
    session_id: int
    total: int
    present: int
    flagged: int
    rejected: int
    records: list[AttendanceRecordResponse]


class AttendanceStreakResponse(BaseModel):
    """Student's current consecutive daily attendance streak."""
    streak: int
