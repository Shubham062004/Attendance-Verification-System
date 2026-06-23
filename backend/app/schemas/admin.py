from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TodaySessionOverview(BaseModel):
    id: int
    title: str
    subject: str
    class_name: str
    start_time: datetime | None = None
    end_time: datetime | None = None
    status: str
    present_count: int
    absent_count: int
    attendance_percentage: float

    model_config = ConfigDict(from_attributes=True)


class DashboardStatsResponse(BaseModel):
    total_students: int
    present_today: int
    absent_today: int
    attendance_percentage_today: float
    active_session_status: str | None = None
    pending_risk_reviews: int
    total_attendance_records: int
    today_sessions: list[TodaySessionOverview] = []


class StudentHistoryResponse(BaseModel):
    id: int
    name: str | None = None
    email: str
    registration_number: str | None = None
    attendance_percentage: float
    present_count: int
    absent_count: int
    last_attendance: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class StudentAttendanceHistoryItem(BaseModel):
    id: int | None = None  # None if ABSENT
    session_id: int
    session_title: str
    session_subject: str
    submitted_at: datetime | None = None
    status: str  # PRESENT, FLAGGED, REJECTED, ABSENT
    risk_score: int | None = None
    risk_level: str | None = None
    notes: str | None = None

    model_config = ConfigDict(from_attributes=True)


class StudentDetailResponse(BaseModel):
    id: int
    name: str | None = None
    email: str
    registration_number: str | None = None
    attendance_percentage: float
    present_sessions: int
    absent_sessions: int
    total_sessions: int
    history: list[StudentAttendanceHistoryItem] = []


class AttendanceOverrideRequest(BaseModel):
    status: str  # PRESENT, REJECTED
    notes: str | None = None
    is_technical_issue: bool | None = None


class AttendanceAddRequest(BaseModel):
    student_id: int
    session_id: int
    status: str  # PRESENT, REJECTED
    notes: str | None = None


class AdminAttendanceRecordListItem(BaseModel):
    id: int
    student_id: int
    student_name: str | None = None
    student_reg_number: str | None = None
    session_id: int
    session_title: str
    status: str
    submitted_at: datetime
    risk_score: int | None = None
    risk_level: str | None = None

    model_config = ConfigDict(from_attributes=True)
