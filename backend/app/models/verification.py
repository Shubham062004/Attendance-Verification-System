from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class VerificationSession(Base):
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return "verification_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Step tracking — boolean flags for each verification stage
    camera_granted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    face_detected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    blink_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    smile_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Overall liveness verdict
    liveness_passed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Status of the verification flow
    # Possible values: PENDING | IN_PROGRESS | PASSED | FAILED | SKIPPED
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False, index=True)

    # Optional failure reason stored for audit purposes
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Attempt counter — students may retry up to a configured maximum
    attempt_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    student = relationship("User", foreign_keys=[student_id])
    session = relationship("AttendanceSession", foreign_keys=[session_id])
