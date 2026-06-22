from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.session import AttendanceSession
from app.models.verification import VerificationSession


def log_audit(db: Session, user_id: int, action: str, details: str | None = None) -> None:
    audit = AuditLog(user_id=user_id, action=action, details=details)
    db.add(audit)
    db.commit()


class VerificationService:
    @staticmethod
    def start_verification(
        db: Session, session_id: int, student_id: int
    ) -> VerificationSession:
        """
        Begin a new liveness verification for a student in a given attendance session.
        If a PENDING or IN_PROGRESS record already exists for this student+session,
        it is returned rather than creating a duplicate.
        """
        attendance_session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
        if not attendance_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attendance session {session_id} not found",
            )
        if attendance_session.status not in ("ACTIVE", "REOPENED"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attendance session is not currently active",
            )

        # Check for an existing in-progress verification
        existing = (
            db.query(VerificationSession)
            .filter(
                VerificationSession.student_id == student_id,
                VerificationSession.session_id == session_id,
                VerificationSession.status.in_(["PENDING", "IN_PROGRESS"]),
            )
            .first()
        )
        if existing:
            return existing

        verification = VerificationSession(
            student_id=student_id,
            session_id=session_id,
            status="IN_PROGRESS",
        )
        db.add(verification)
        db.commit()
        db.refresh(verification)

        log_audit(
            db,
            user_id=student_id,
            action="Verification Started",
            details=f"Liveness verification started for session ID {session_id}",
        )

        return verification

    @staticmethod
    def complete_verification(
        db: Session,
        verification_id: int,
        student_id: int,
        camera_granted: bool,
        face_detected: bool,
        blink_verified: bool,
        smile_verified: bool,
        failure_reason: str | None = None,
    ) -> VerificationSession:
        """
        Record the browser-side liveness check results and determine the final outcome.
        Only the owning student can complete their own verification record.
        """
        verification = (
            db.query(VerificationSession)
            .filter(VerificationSession.id == verification_id)
            .first()
        )
        if not verification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Verification session {verification_id} not found",
            )
        if verification.student_id != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to complete this verification",
            )

        # Determine overall liveness result
        liveness_passed = camera_granted and face_detected and blink_verified and smile_verified

        verification.camera_granted = camera_granted
        verification.face_detected = face_detected
        verification.blink_verified = blink_verified
        verification.smile_verified = smile_verified
        verification.liveness_passed = liveness_passed
        verification.status = "PASSED" if liveness_passed else "FAILED"
        verification.failure_reason = failure_reason if not liveness_passed else None
        verification.completed_at = datetime.now(UTC)

        db.commit()
        db.refresh(verification)

        log_audit(
            db,
            user_id=student_id,
            action=f"Verification {'Passed' if liveness_passed else 'Failed'}",
            details=(
                f"Liveness verification {'passed' if liveness_passed else 'failed'} "
                f"for session ID {verification.session_id}. "
                f"Camera={camera_granted}, Face={face_detected}, "
                f"Blink={blink_verified}, Smile={smile_verified}."
                + (f" Reason: {failure_reason}" if failure_reason else "")
            ),
        )

        return verification

    @staticmethod
    def get_verification_by_id(
        db: Session, verification_id: int
    ) -> VerificationSession | None:
        """Fetch a verification record by its primary key."""
        return (
            db.query(VerificationSession)
            .filter(VerificationSession.id == verification_id)
            .first()
        )

    @staticmethod
    def get_verifications_by_session(
        db: Session, session_id: int
    ) -> list[VerificationSession]:
        """Fetch all verification records for a given attendance session (admin view)."""
        return (
            db.query(VerificationSession)
            .filter(VerificationSession.session_id == session_id)
            .order_by(VerificationSession.started_at.desc())
            .all()
        )

    @staticmethod
    def get_verifications_by_student(
        db: Session, student_id: int
    ) -> list[VerificationSession]:
        """Fetch all verification records for a given student."""
        return (
            db.query(VerificationSession)
            .filter(VerificationSession.student_id == student_id)
            .order_by(VerificationSession.started_at.desc())
            .all()
        )
