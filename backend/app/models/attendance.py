import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class AttendanceStatus(enum.StrEnum):
    PRESENT = "PRESENT"
    FLAGGED = "FLAGGED"
    REJECTED = "REJECTED"


class AttendanceRecord(Base):
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return "attendance_records"

    __table_args__ = (
        UniqueConstraint("student_id", "session_id", name="uq_student_session_attendance"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Linked verification artifacts (nullable — evidence may not exist for FLAGGED/REJECTED)
    location_validation_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("location_validations.id", ondelete="SET NULL"), nullable=True
    )
    verification_session_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("verification_sessions.id", ondelete="SET NULL"), nullable=True
    )
    evidence_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("attendance_evidence.id", ondelete="SET NULL"), nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(20), default=AttendanceStatus.PRESENT.value, nullable=False, index=True
    )

    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    session = relationship("AttendanceSession", foreign_keys=[session_id])
    location_validation = relationship("LocationValidation", foreign_keys=[location_validation_id])
    verification_session = relationship("VerificationSession", foreign_keys=[verification_session_id])
    evidence = relationship("AttendanceEvidence", foreign_keys=[evidence_id])
