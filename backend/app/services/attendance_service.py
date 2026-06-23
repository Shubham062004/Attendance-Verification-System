from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.audit import AuditLog
from app.models.evidence import AttendanceEvidence
from app.models.location import LocationValidation
from app.models.session import AttendanceSession
from app.models.verification import VerificationSession
from app.schemas.attendance import AttendanceSubmitResponse, SessionAttendanceSummary


def log_audit(db: Session, user_id: int, action: str, details: str | None = None) -> None:
    audit = AuditLog(user_id=user_id, action=action, details=details)
    db.add(audit)
    db.commit()


class AttendanceService:
    @staticmethod
    def submit(
        db: Session,
        session_id: int,
        student_id: int,
    ) -> AttendanceSubmitResponse:
        """
        Core attendance submission engine.

        Validates all prerequisites:
          1. Session must be ACTIVE or REOPENED.
          2. A location validation record must exist for this student+session.
          3. A liveness verification record (PASSED) must exist for this student+session.
          4. An attendance evidence (selfie) record must exist for this student+session.
          5. No duplicate attendance record may exist.

        Creates the attendance record with PRESENT status.
        Flags if risk signals are elevated.
        """
        # ── 1. Session check ──────────────────────────────────────────────────
        session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attendance session {session_id} not found",
            )
        if session.status not in ("ACTIVE", "REOPENED"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attendance can only be submitted for an ACTIVE or REOPENED session",
            )

        # ── 2. Duplicate check ───────────────────────────────────────────────
        existing = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.session_id == session_id,
            )
            .first()
        )
        if existing:
            log_audit(
                db,
                user_id=student_id,
                action="Duplicate Attendance Attempt",
                details=f"Student {student_id} attempted duplicate attendance for session {session_id}",
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Attendance already marked for this session. Each student may only submit once.",
            )

        # ── 3. Location validation check ─────────────────────────────────────
        location_record = (
            db.query(LocationValidation)
            .filter(
                LocationValidation.student_id == student_id,
                LocationValidation.session_id == session_id,
            )
            .order_by(LocationValidation.created_at.desc())
            .first()
        )
        if not location_record:
            log_audit(
                db,
                user_id=student_id,
                action="Attendance Rejected",
                details=f"Missing location verification for session {session_id}",
            )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Location verification is required before submitting attendance.",
            )

        # ── 4. Liveness verification check ───────────────────────────────────
        verification_record = (
            db.query(VerificationSession)
            .filter(
                VerificationSession.student_id == student_id,
                VerificationSession.session_id == session_id,
                VerificationSession.status == "PASSED",
            )
            .order_by(VerificationSession.started_at.desc())
            .first()
        )
        if not verification_record:
            log_audit(
                db,
                user_id=student_id,
                action="Attendance Rejected",
                details=f"Missing or failed liveness verification for session {session_id}",
            )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Liveness verification must be completed and passed before submitting attendance.",
            )

        # ── 5. Selfie evidence check ──────────────────────────────────────────
        evidence_record = (
            db.query(AttendanceEvidence)
            .filter(
                AttendanceEvidence.student_id == student_id,
                AttendanceEvidence.session_id == session_id,
            )
            .order_by(AttendanceEvidence.uploaded_at.desc())
            .first()
        )
        if not evidence_record:
            log_audit(
                db,
                user_id=student_id,
                action="Attendance Rejected",
                details=f"Missing attendance selfie evidence for session {session_id}",
            )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Selfie evidence is required before submitting attendance.",
            )

        # ── 6. Create attendance record ───────────────────────────────────────
        try:
            record = AttendanceRecord(
                student_id=student_id,
                session_id=session_id,
                location_validation_id=location_record.id,
                verification_session_id=verification_record.id,
                evidence_id=evidence_record.id,
                status=AttendanceStatus.PRESENT.value,
            )
            db.add(record)
            db.commit()
            db.refresh(record)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Attendance already marked for this session.",
            ) from None

        # ── 7. Run Risk Engine ────────────────────────────────────────────────
        from app.services.risk_service import RiskService
        assessment = RiskService.evaluate_attendance(db, record.id)
        db.refresh(record)  # Refresh to get updated status if it got flagged

        # ── 8. Audit log ──────────────────────────────────────────────────────
        log_audit(
            db,
            user_id=student_id,
            action="Attendance Submitted",
            details=(
                f"Attendance submitted for session {session_id}. "
                f"Record ID: {record.id}. Status: {record.status}. "
                f"Risk Score: {assessment.risk_score} ({assessment.risk_level})."
            ),
        )

        return AttendanceSubmitResponse(
            attendance_marked=True,
            status=record.status,
            record_id=record.id,
            session_id=session_id,
            session_title=session.title,
            session_subject=session.subject,
            session_class=session.class_name,
            submitted_at=record.submitted_at,
        )

    @staticmethod
    def get_record_by_id(db: Session, record_id: int) -> AttendanceRecord | None:
        return db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()

    @staticmethod
    def get_session_attendance(db: Session, session_id: int) -> SessionAttendanceSummary:
        records = (
            db.query(AttendanceRecord)
            .filter(AttendanceRecord.session_id == session_id)
            .order_by(AttendanceRecord.submitted_at.desc())
            .all()
        )
        return SessionAttendanceSummary(
            session_id=session_id,
            total=len(records),
            present=sum(1 for r in records if r.status == AttendanceStatus.PRESENT.value),
            flagged=sum(1 for r in records if r.status == AttendanceStatus.FLAGGED.value),
            rejected=sum(1 for r in records if r.status == AttendanceStatus.REJECTED.value),
            records=records,
        )

    @staticmethod
    def get_student_attendance(db: Session, student_id: int) -> list[AttendanceRecord]:
        return (
            db.query(AttendanceRecord)
            .filter(AttendanceRecord.student_id == student_id)
            .order_by(AttendanceRecord.submitted_at.desc())
            .all()
        )
