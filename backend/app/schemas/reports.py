from pydantic import BaseModel


class EODReportStudentItem(BaseModel):
    s_no: int
    student_name: str
    registration_number: str
    slot_10_11: str  # "Present", "Absent", "—"
    slot_11_12: str
    slot_12_13: str
    slot_14_15: str
    slot_15_16: str
    attendance_percentage: str


class EODReportResponse(BaseModel):
    date: str
    records: list[EODReportStudentItem] = []


class SessionReportResponse(BaseModel):
    session_id: int
    session_title: str
    subject: str
    class_name: str
    present_count: int
    absent_count: int
    attendance_percentage: float


class StudentReportResponse(BaseModel):
    student_id: int
    student_name: str
    registration_number: str | None = None
    email: str
    present_count: int
    absent_count: int
    attendance_percentage: float


class AttendanceSummaryResponse(BaseModel):
    highest_attendance_pct: float
    highest_attendance_student: str | None = None
    lowest_attendance_pct: float
    lowest_attendance_student: str | None = None
    average_attendance_pct: float
    total_present: int
    total_absent: int
