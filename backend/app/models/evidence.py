from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class AttendanceEvidence(Base):
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return "attendance_evidence"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Cloudinary storage details
    image_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    image_public_id: Mapped[str] = mapped_column(String(512), nullable=False)

    # Image metadata (populated from Cloudinary upload response)
    image_size: Mapped[int | None] = mapped_column(Integer, nullable=True)    # bytes
    image_width: Mapped[int | None] = mapped_column(Integer, nullable=True)   # px
    image_height: Mapped[int | None] = mapped_column(Integer, nullable=True)  # px

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    student = relationship("User", foreign_keys=[student_id])
    session = relationship("AttendanceSession", foreign_keys=[session_id])
