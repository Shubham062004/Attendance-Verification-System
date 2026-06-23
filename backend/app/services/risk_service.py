from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.audit import AuditLog
from app.models.location import LocationValidation
from app.models.risk import AttendanceFlag, FlagSeverity, RiskAssessment, RiskLevel
from app.models.session import AttendanceSession
from app.models.verification import VerificationSession


def log_audit(db: Session, user_id: int, action: str, details: str | None = None) -> None:
    audit = AuditLog(user_id=user_id, action=action, details=details)
    db.add(audit)
    db.commit()


class RiskService:
    @staticmethod
    def evaluate_attendance(db: Session, attendance_id: int) -> RiskAssessment:
        """
        Evaluate attendance record for potential risk signals.
        Computes risk score, generates flags, saves RiskAssessment.
        """
        record = db.query(AttendanceRecord).filter(AttendanceRecord.id == attendance_id).first()
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attendance record with ID {attendance_id} not found"
            )

        # Remove existing risk assessment and flags if they exist (for re-evaluation support)
        existing_assessment = db.query(RiskAssessment).filter(RiskAssessment.attendance_record_id == attendance_id).first()
        if existing_assessment:
            db.delete(existing_assessment)
        db.query(AttendanceFlag).filter(AttendanceFlag.attendance_record_id == attendance_id).delete()
        db.commit()

        risk_score = 0
        flags_to_create = []

        # ── 1. Missing Verification Step check ───────────────────────────────
        missing_steps = []
        if not record.location_validation_id:
            missing_steps.append("Location Validation")
        if not record.verification_session_id:
            missing_steps.append("Liveness Verification")
        if not record.evidence_id:
            missing_steps.append("Selfie Evidence")

        if missing_steps:
            risk_score += 100
            flags_to_create.append(
                AttendanceFlag(
                    attendance_record_id=attendance_id,
                    flag_type="MISSING_VERIFICATION",
                    flag_reason=f"Bypassed verification steps: {', '.join(missing_steps)}",
                    severity=FlagSeverity.HIGH.value
                )
            )

        # Fetch linked models safely
        location_record = None
        if record.location_validation_id:
            location_record = db.query(LocationValidation).filter(LocationValidation.id == record.location_validation_id).first()
        
        verification_record = None
        if record.verification_session_id:
            verification_record = db.query(VerificationSession).filter(VerificationSession.id == record.verification_session_id).first()

        session_record = db.query(AttendanceSession).filter(AttendanceSession.id == record.session_id).first()

        # ── 2. Location rules ───────────────────────────────────────────────
        if location_record:
            if not location_record.is_within_radius:
                risk_score += 50
                flags_to_create.append(
                    AttendanceFlag(
                        attendance_record_id=attendance_id,
                        flag_type="OUTSIDE_RADIUS",
                        flag_reason=f"Student was outside allowed radius (Distance: {location_record.distance_from_center:.1f}m)",
                        severity=FlagSeverity.HIGH.value
                    )
                )

            # Poor GPS Accuracy threshold: > 15m
            if location_record.accuracy is None or location_record.accuracy > 15.0:
                risk_score += 20
                accuracy_val = f"{location_record.accuracy:.1f}m" if location_record.accuracy else "Unknown"
                flags_to_create.append(
                    AttendanceFlag(
                        attendance_record_id=attendance_id,
                        flag_type="POOR_GPS_ACCURACY",
                        flag_reason=f"Poor GPS accuracy reported: {accuracy_val}",
                        severity=FlagSeverity.LOW.value
                    )
                )
        else:
            if not missing_steps:  # If not flagged as missing already but somehow record is None
                risk_score += 100
                flags_to_create.append(
                    AttendanceFlag(
                        attendance_record_id=attendance_id,
                        flag_type="MISSING_LOCATION",
                        flag_reason="Location validation record is missing",
                        severity=FlagSeverity.HIGH.value
                    )
                )

        # ── 3. Biometric / Camera rules ──────────────────────────────────────
        if verification_record:
            if not verification_record.blink_verified:
                risk_score += 30
                flags_to_create.append(
                    AttendanceFlag(
                        attendance_record_id=attendance_id,
                        flag_type="NO_BLINK",
                        flag_reason="Blink detection was not successfully verified during liveness check",
                        severity=FlagSeverity.MEDIUM.value
                    )
                )

            if not verification_record.smile_verified:
                risk_score += 30
                flags_to_create.append(
                    AttendanceFlag(
                        attendance_record_id=attendance_id,
                        flag_type="NO_SMILE",
                        flag_reason="Smile detection was not successfully verified during liveness check",
                        severity=FlagSeverity.MEDIUM.value
                    )
                )

            # Multiple submission attempts rule: +40
            # Check if camera/liveness verification required multiple attempts (attempt_count > 1)
            # OR if audit logs show duplicate attendance attempts
            duplicate_audit_count = db.query(AuditLog).filter(
                AuditLog.user_id == record.student_id,
                AuditLog.action == "Duplicate Attendance Attempt",
                AuditLog.details.like(f"%session {record.session_id}%")
            ).count()

            if verification_record.attempt_count > 1 or duplicate_audit_count > 0:
                risk_score += 40
                reason_details = []
                if verification_record.attempt_count > 1:
                    reason_details.append(f"{verification_record.attempt_count} liveness attempts")
                if duplicate_audit_count > 0:
                    reason_details.append(f"{duplicate_audit_count} duplicate submissions blocked")
                flags_to_create.append(
                    AttendanceFlag(
                        attendance_record_id=attendance_id,
                        flag_type="MULTIPLE_ATTEMPTS",
                        flag_reason=f"Multiple attempts captured: {', '.join(reason_details)}",
                        severity=FlagSeverity.MEDIUM.value
                    )
                )
        else:
            if not missing_steps:
                risk_score += 100
                flags_to_create.append(
                    AttendanceFlag(
                        attendance_record_id=attendance_id,
                        flag_type="MISSING_LIVENESS",
                        flag_reason="Liveness verification session record is missing",
                        severity=FlagSeverity.HIGH.value
                    )
                )

        # ── 4. Timing rules ──────────────────────────────────────────────────
        if session_record and session_record.end_time:
            if record.submitted_at > session_record.end_time:
                risk_score += 15
                flags_to_create.append(
                    AttendanceFlag(
                        attendance_record_id=attendance_id,
                        flag_type="LATE_SUBMISSION",
                        flag_reason=f"Attendance submitted late (End Time: {session_record.end_time.strftime('%H:%M:%S')})",
                        severity=FlagSeverity.LOW.value
                    )
                )

        # ── 5. Classify Risk Level ───────────────────────────────────────────
        if risk_score >= 70:
            risk_level = RiskLevel.HIGH_RISK.value
        elif risk_score >= 30:
            risk_level = RiskLevel.REVIEW.value
        else:
            risk_level = RiskLevel.SAFE.value

        # Create assessment record
        assessment = RiskAssessment(
            attendance_record_id=attendance_id,
            risk_score=risk_score,
            risk_level=risk_level,
            reviewed=False
        )
        db.add(assessment)
        db.commit()

        # Save all generated flags
        for flag in flags_to_create:
            db.add(flag)
            log_audit(
                db,
                user_id=record.student_id,
                action="Flag Created",
                details=f"Flag {flag.flag_type} ({flag.severity}) generated for attendance record #{attendance_id}. Reason: {flag.flag_reason}"
            )
        db.commit()

        # Update attendance record status to FLAGGED if it's REVIEW or HIGH_RISK
        # If it's SAFE, keep it PRESENT or whatever status it has.
        if risk_level in (RiskLevel.REVIEW.value, RiskLevel.HIGH_RISK.value):
            record.status = AttendanceStatus.FLAGGED.value
            db.commit()

        log_audit(
            db,
            user_id=record.student_id,
            action="Risk Generated",
            details=f"Risk score: {risk_score} ({risk_level}) for attendance record #{attendance_id}"
        )

        return assessment

    @staticmethod
    def review_assessment(
        db: Session, assessment_id: int, status_choice: str, notes: str | None, reviewer_id: int
    ) -> RiskAssessment:
        """
        Review a pending risk assessment. Updates attendance status accordingly.
        """
        assessment = db.query(RiskAssessment).filter(RiskAssessment.id == assessment_id).first()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Risk assessment {assessment_id} not found"
            )

        if status_choice not in (AttendanceStatus.PRESENT.value, AttendanceStatus.REJECTED.value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid review status. Must be PRESENT (Approve) or REJECTED (Reject)"
            )

        assessment.reviewed = True
        assessment.reviewed_by = reviewer_id
        assessment.reviewed_at = datetime.now(UTC)
        assessment.notes = notes

        # Update core attendance record status
        record = db.query(AttendanceRecord).filter(AttendanceRecord.id == assessment.attendance_record_id).first()
        if record:
            record.status = status_choice

        db.commit()
        db.refresh(assessment)

        # Log audits
        audit_action = "Attendance Approved" if status_choice == AttendanceStatus.PRESENT.value else "Attendance Rejected"
        log_audit(
            db,
            user_id=reviewer_id,
            action=audit_action,
            details=f"Admin reviewed assessment #{assessment_id} and marked attendance as {status_choice}. Notes: {notes or 'None'}"
        )
        log_audit(
            db,
            user_id=reviewer_id,
            action="Risk Reviewed",
            details=f"Risk assessment #{assessment_id} reviewed and closed."
        )

        return assessment
