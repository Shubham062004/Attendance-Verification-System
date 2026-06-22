from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.verification import (
    VerificationCompleteRequest,
    VerificationSessionResponse,
    VerificationStartRequest,
)
from app.services.verification_service import VerificationService
from app.utils.auth import RoleChecker, get_current_user

router = APIRouter(tags=["verification"])

admin_or_dev_required = Depends(RoleChecker(["Admin", "Developer"]))


@router.post(
    "/verification/start",
    response_model=VerificationSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_verification(
    payload: VerificationStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Begin a liveness verification session for the authenticated student.
    Returns an existing IN_PROGRESS record if one already exists.
    """
    return VerificationService.start_verification(
        db=db,
        session_id=payload.session_id,
        student_id=int(current_user.id),
    )


@router.post("/verification/complete", response_model=VerificationSessionResponse)
def complete_verification(
    payload: VerificationCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Record the browser-side liveness check results (camera, face, blink, smile).
    The final liveness verdict is computed server-side from the submitted flags.
    """
    return VerificationService.complete_verification(
        db=db,
        verification_id=payload.verification_id,
        student_id=int(current_user.id),
        camera_granted=payload.camera_granted,
        face_detected=payload.face_detected,
        blink_verified=payload.blink_verified,
        smile_verified=payload.smile_verified,
        failure_reason=payload.failure_reason,
    )


@router.get("/verification/{id}", response_model=VerificationSessionResponse)
def get_verification(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve a single verification record.
    Students can only view their own records; Admins/Developers can view any.
    """
    record = VerificationService.get_verification_by_id(db, id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Verification record {id} not found",
        )
    if current_user.role not in ("Admin", "Developer") and int(current_user.id) != record.student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this verification record",
        )
    return record


@router.get(
    "/verification/session/{session_id}",
    response_model=list[VerificationSessionResponse],
    dependencies=[admin_or_dev_required],
)
def get_verifications_by_session(
    session_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieve all verification records for an attendance session. (Admin/Developer only)
    """
    return VerificationService.get_verifications_by_session(db, session_id)
