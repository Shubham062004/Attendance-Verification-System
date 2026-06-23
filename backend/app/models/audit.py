from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class AuditLog(Base):
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    actor_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    actor_name: Mapped[str | None] = mapped_column(String, nullable=True)
    actor_role: Mapped[str | None] = mapped_column(String, nullable=True)
    action_type: Mapped[str] = mapped_column(String, nullable=False, index=True)
    entity_type: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(String, nullable=False)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    actor = relationship("User", foreign_keys=[actor_id])

