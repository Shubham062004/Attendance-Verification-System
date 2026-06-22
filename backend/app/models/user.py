from datetime import datetime
from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.sql import func
from sqlalchemy.orm import declared_attr, Mapped, mapped_column

from app.db.base_class import Base


class User(Base):
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    google_id: Mapped[str | None] = mapped_column(String, unique=True, index=True, nullable=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    registration_number: Mapped[str | None] = mapped_column(String, unique=True, index=True, nullable=True)
    role: Mapped[str] = mapped_column(String, default="Student", nullable=False)  # Roles: Student, Admin, Developer
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
