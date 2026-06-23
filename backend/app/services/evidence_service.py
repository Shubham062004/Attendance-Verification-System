import time

import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.audit import AuditLog
from app.models.evidence import AttendanceEvidence
from app.models.session import AttendanceSession

# Maximum accepted file size: 5 MB
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
MIN_IMAGE_DIMENSION = 400  # pixels


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


class EvidenceService:
    @staticmethod
    def generate_upload_signature(student_id: int, session_id: int) -> dict:
        """
        Generate Cloudinary signed-upload parameters so the browser can upload
        directly to Cloudinary without proxying the image through the API server.
        Naming convention: attendance/selfies/studentId_sessionId_timestamp
        """
        if not all(
            [settings.CLOUDINARY_CLOUD_NAME, settings.CLOUDINARY_API_KEY, settings.CLOUDINARY_API_SECRET]
        ):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cloudinary is not configured on this server",
            )

        timestamp = int(time.time())
        folder = "attendance/selfies"
        public_id = f"{folder}/{student_id}_{session_id}_{timestamp}"

        params_to_sign = {
            "folder": folder,
            "public_id": public_id,
            "timestamp": timestamp,
        }

        signature = cloudinary.utils.api_sign_request(
            params_to_sign, settings.CLOUDINARY_API_SECRET
        )

        return {
            "signature": signature,
            "api_key": settings.CLOUDINARY_API_KEY,
            "cloud_name": settings.CLOUDINARY_CLOUD_NAME,
            "timestamp": timestamp,
            "folder": folder,
            "public_id": public_id,
            "upload_url": f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/image/upload",
        }

    @staticmethod
    def store_evidence(
        db: Session,
        session_id: int,
        student_id: int,
        image_url: str,
        image_public_id: str,
        image_size: int | None,
        image_width: int | None,
        image_height: int | None,
    ) -> AttendanceEvidence:
        """
        Validate and persist the Cloudinary upload metadata as an attendance evidence record.
        Business rules:
          - Session must exist and be ACTIVE or REOPENED.
          - Image dimensions must be at least 400×400 px (if provided).
          - File size must not exceed 5 MB (if provided).
        """
        attendance_session = (
            db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
        )
        if not attendance_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attendance session {session_id} not found",
            )
        if attendance_session.status not in ("ACTIVE", "REOPENED"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Evidence can only be submitted for an ACTIVE or REOPENED session",
            )

        # Dimension validation
        if image_width is not None and image_height is not None:
            if image_width < MIN_IMAGE_DIMENSION or image_height < MIN_IMAGE_DIMENSION:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        f"Image must be at least {MIN_IMAGE_DIMENSION}×{MIN_IMAGE_DIMENSION} px. "
                        f"Got {image_width}×{image_height} px."
                    ),
                )

        # File-size validation
        if image_size is not None and image_size > MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Image exceeds the 5 MB size limit "
                    f"({image_size / 1024 / 1024:.2f} MB submitted)."
                ),
            )

        evidence = AttendanceEvidence(
            student_id=student_id,
            session_id=session_id,
            image_url=image_url,
            image_public_id=image_public_id,
            image_size=image_size,
            image_width=image_width,
            image_height=image_height,
        )
        db.add(evidence)
        db.commit()
        db.refresh(evidence)

        log_audit(
            db,
            user_id=student_id,
            action="Selfie Uploaded",
            details=(
                f"Evidence stored for session {session_id}. "
                f"Cloudinary public_id: {image_public_id}. "
                f"Size: {image_size} bytes."
            ),
        )

        return evidence

    @staticmethod
    def get_evidence_by_id(db: Session, evidence_id: int) -> AttendanceEvidence | None:
        """Fetch a single evidence record by primary key."""
        return (
            db.query(AttendanceEvidence).filter(AttendanceEvidence.id == evidence_id).first()
        )

    @staticmethod
    def get_evidence_by_session(db: Session, session_id: int) -> list[AttendanceEvidence]:
        """Fetch all evidence records for a session (admin view)."""
        return (
            db.query(AttendanceEvidence)
            .filter(AttendanceEvidence.session_id == session_id)
            .order_by(AttendanceEvidence.uploaded_at.desc())
            .all()
        )

    @staticmethod
    def get_evidence_by_student_session(
        db: Session, student_id: int, session_id: int
    ) -> list[AttendanceEvidence]:
        """Fetch all evidence records for a student within a specific session."""
        return (
            db.query(AttendanceEvidence)
            .filter(
                AttendanceEvidence.student_id == student_id,
                AttendanceEvidence.session_id == session_id,
            )
            .order_by(AttendanceEvidence.uploaded_at.desc())
            .all()
        )

    @staticmethod
    def delete_evidence(db: Session, evidence_id: int, student_id: int, is_admin: bool) -> None:
        """
        Delete an evidence record and remove the image from Cloudinary.
        Only the owning student or Admin/Developer may delete.
        """
        evidence = (
            db.query(AttendanceEvidence).filter(AttendanceEvidence.id == evidence_id).first()
        )
        if not evidence:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence record {evidence_id} not found",
            )
        if not is_admin and evidence.student_id != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to delete this evidence record",
            )

        public_id = evidence.image_public_id

        # Remove from Cloudinary
        try:
            cloudinary.uploader.destroy(public_id)
        except Exception:
            # Log but do not block the DB delete
            pass

        db.delete(evidence)
        db.commit()

        log_audit(
            db,
            user_id=student_id,
            action="Selfie Deleted",
            details=f"Evidence {evidence_id} deleted. Cloudinary public_id: {public_id}",
        )
