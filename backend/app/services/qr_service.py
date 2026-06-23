import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.session import AttendanceSession
from app.models.token import SessionToken
from app.models.user import User


def log_audit(db: Session, user_id: int, action: str, details: str | None = None) -> None:
    from app.models.user import User
    user = db.query(User).filter(User.id == user_id).first()
    audit = AuditLog(
        actor_id=user_id,
        actor_name=user.name if user else None,
        actor_role=user.role if user else None,
        action_type=action,
        description=details or "",
    )
    db.add(audit)
    db.commit()


class QRService:
    @staticmethod
    def generate_token(db: Session, session_id: int, creator_id: int) -> SessionToken:
        """
        Generates a new secure session token, setting all prior tokens for the session to inactive.
        The token is set to expire in 30 seconds.
        """
        session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID {session_id} not found",
            )

        if session.status not in ["ACTIVE", "REOPENED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot generate QR token for a session in {session.status} state. Session must be ACTIVE or REOPENED.",
            )

        # Deactivate all existing active tokens for this session
        db.query(SessionToken).filter(
            SessionToken.session_id == session_id, SessionToken.is_active
        ).update({"is_active": False})
        db.commit()

        # Create cryptographically secure URL-safe token
        token_val = f"qr_{session_id}_{secrets.token_urlsafe(16)}"
        expires_at = datetime.now(UTC) + timedelta(seconds=30)

        db_token = SessionToken(
            session_id=session_id, token=token_val, expires_at=expires_at, is_active=True
        )
        db.add(db_token)
        db.commit()
        db.refresh(db_token)

        log_audit(
            db,
            user_id=creator_id,
            action="QR Generated",
            details=f"Generated new QR token for session ID {session_id}",
        )

        return db_token

    @staticmethod
    def get_or_create_current_token(db: Session, session_id: int, creator_id: int) -> SessionToken:
        """
        Retrieves the current active token for the session.
        If it does not exist or has expired, automatically generates/rotates a new one.
        """
        now = datetime.now(UTC)
        current = (
            db.query(SessionToken)
            .filter(SessionToken.session_id == session_id, SessionToken.is_active)
            .order_by(SessionToken.created_at.desc())
            .first()
        )

        if not current or current.expires_at < now:
            # Token is missing or expired, rotate it
            if current:
                current.is_active = False
                db.commit()
                log_audit(
                    db,
                    user_id=creator_id,
                    action="QR Expired",
                    details=f"Token expired automatically for session ID {session_id}",
                )

            current = QRService.generate_token(db, session_id, creator_id)
            log_audit(
                db,
                user_id=creator_id,
                action="QR Refreshed",
                details=f"QR token rotated for session ID {session_id}",
            )

        return current

    @staticmethod
    def validate_token(db: Session, token_str: str, user_id: int) -> dict:
        """
        Validates the provided QR token.
        Checks for active status, expiration time, and session status.
        """
        now = datetime.now(UTC)
        db_token = (
            db.query(SessionToken)
            .filter(SessionToken.token == token_str, SessionToken.is_active)
            .first()
        )

        if not db_token:
            return {"valid": False, "reason": "Invalid or inactive QR token"}

        if db_token.expires_at < now:
            db_token.is_active = False
            db.commit()
            log_audit(
                db,
                user_id=user_id,
                action="QR Expired",
                details=f"Token validation failed due to expiration for session ID {db_token.session_id}",
            )
            return {"valid": False, "reason": "QR token has expired"}

        # Validate parent session
        session = (
            db.query(AttendanceSession).filter(AttendanceSession.id == db_token.session_id).first()
        )
        if not session:
            return {"valid": False, "reason": "Attendance session not found"}

        if session.status not in ["ACTIVE", "REOPENED"]:
            return {
                "valid": False,
                "reason": f"Attendance session is no longer active (status: {session.status})",
            }

        # Fetch teacher details
        teacher = db.query(User).filter(User.id == session.created_by).first()
        teacher_name = teacher.name if teacher else "Instructor"

        log_audit(
            db,
            user_id=user_id,
            action="QR Validated",
            details=f"Successfully validated QR token for session ID {session.id}",
        )

        return {
            "valid": True,
            "session_id": session.id,
            "session_title": session.title,
            "subject": session.subject,
            "class_name": session.class_name,
            "teacher_name": teacher_name,
        }
