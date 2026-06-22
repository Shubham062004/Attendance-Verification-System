from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class ClassroomLocation(Base):
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return "classroom_locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    allowed_radius: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)  # in meters
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session = relationship("AttendanceSession", foreign_keys=[session_id])


class LocationValidation(Base):
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return "location_validations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)  # in meters
    distance_from_center: Mapped[float | None] = mapped_column(Float, nullable=True)  # in meters
    is_within_radius: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True, nullable=False
    )

    student = relationship("User", foreign_keys=[student_id])
    session = relationship("AttendanceSession", foreign_keys=[session_id])
