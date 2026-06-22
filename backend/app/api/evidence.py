from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.evidence import (
    AttendanceEvidenceResponse,
    EvidenceCreateRequest,
    UploadSignatureResponse,
)
from app.services.evidence_service import EvidenceService
from app.utils.auth import RoleChecker, get_current_user

router = APIRouter(tags=["evidence"])

admin_or_dev_required = Depends(RoleChecker(["Admin", "Developer"]))


@router.post(
    "/evidence/upload-signature",
    response_model=UploadSignatureResponse,
)
def get_upload_signature(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a signed Cloudinary upload token for direct browser-to-Cloudinary upload.
    The client uses this signature to upload the selfie directly without proxying
    the image bytes through the API server.
    """
    result = EvidenceService.generate_upload_signature(
        student_id=int(current_user.id),
        session_id=session_id,
    )
    return result


@router.post(
    "/evidence",
    response_model=AttendanceEvidenceResponse,
    status_code=status.HTTP_201_CREATED,
)
def store_evidence(
    payload: EvidenceCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Store attendance evidence metadata after a successful Cloudinary upload.
    The frontend uploads the selfie directly to Cloudinary, then calls this
    endpoint with the resulting image URL and metadata.
    """
    return EvidenceService.store_evidence(
        db=db,
        session_id=payload.session_id,
        student_id=int(current_user.id),
        image_url=payload.image_url,
        image_public_id=payload.image_public_id,
        image_size=payload.image_size,
        image_width=payload.image_width,
        image_height=payload.image_height,
    )


@router.get("/evidence/{id}", response_model=AttendanceEvidenceResponse)
def get_evidence(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve an evidence record by ID.
    Students can only view their own records; Admin/Developers can view any.
    """
    record = EvidenceService.get_evidence_by_id(db, id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence record {id} not found",
        )
    if current_user.role not in ("Admin", "Developer") and int(current_user.id) != record.student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this evidence record",
        )
    return record


@router.get(
    "/evidence/session/{session_id}",
    response_model=list[AttendanceEvidenceResponse],
    dependencies=[admin_or_dev_required],
)
def get_evidence_by_session(
    session_id: int,
    db: Session = Depends(get_db),
):
    """
    List all evidence records for an attendance session. (Admin/Developer only)
    """
    return EvidenceService.get_evidence_by_session(db, session_id)


@router.delete("/evidence/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_evidence(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete an evidence record and remove the image from Cloudinary.
    Only the owning student or Admin/Developer may delete.
    """
    is_admin = current_user.role in ("Admin", "Developer")
    EvidenceService.delete_evidence(
        db=db,
        evidence_id=id,
        student_id=int(current_user.id),
        is_admin=is_admin,
    )
