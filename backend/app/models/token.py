from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class SessionToken(Base):
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return "session_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("attendance_sessions.id"), nullable=False
    )
    token: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session = relationship("AttendanceSession", foreign_keys=[session_id])
