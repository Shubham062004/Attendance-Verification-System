import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class RiskLevel(enum.StrEnum):
    SAFE = "SAFE"
    REVIEW = "REVIEW"
    HIGH_RISK = "HIGH_RISK"


class FlagSeverity(enum.StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class RiskAssessment(Base):
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return "risk_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    attendance_record_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    risk_level: Mapped[str] = mapped_column(
        String(20), default=RiskLevel.SAFE.value, nullable=False, index=True
    )
    reviewed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    reviewed_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    attendance_record = relationship("AttendanceRecord", foreign_keys=[attendance_record_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class AttendanceFlag(Base):
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return "attendance_flags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    attendance_record_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False, index=True
    )
    flag_type: Mapped[str] = mapped_column(String(50), nullable=False)
    flag_reason: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[str] = mapped_column(
        String(20), default=FlagSeverity.LOW.value, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    attendance_record = relationship("AttendanceRecord", foreign_keys=[attendance_record_id])
