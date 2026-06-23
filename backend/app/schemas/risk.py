from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.risk import FlagSeverity, RiskLevel


class AttendanceFlagSchema(BaseModel):
    id: int
    attendance_record_id: int
    flag_type: str
    flag_reason: str
    severity: FlagSeverity
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RiskAssessmentSchema(BaseModel):
    id: int
    attendance_record_id: int
    risk_score: int
    risk_level: RiskLevel
    reviewed: bool
    reviewed_by: int | None = None
    reviewed_at: datetime | None = None
    notes: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RiskAssessmentWithFlagsSchema(RiskAssessmentSchema):
    flags: list[AttendanceFlagSchema] = []
    student_name: str | None = None
    student_reg_number: str | None = None
    session_title: str | None = None

    model_config = ConfigDict(from_attributes=True)


class RiskEvaluateRequest(BaseModel):
    attendance_record_id: int


class RiskReviewRequest(BaseModel):
    status: str  # "PRESENT", "REJECTED"
    notes: str | None = None


class RiskOverviewStats(BaseModel):
    total_safe: int
    total_review: int
    total_high_risk: int
    pending_reviews: int
