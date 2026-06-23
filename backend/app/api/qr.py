from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.token import SessionToken
from app.models.user import User
from app.schemas.qr import QRTokenResponse, QRValidateRequest, QRValidateResponse
from app.services.qr_service import QRService
from app.utils.auth import RoleChecker, get_current_user

router = APIRouter(tags=["qr-access"])

admin_or_dev_required = Depends(RoleChecker(["Admin", "Developer"]))
any_role_required = Depends(get_current_user)


@router.post(
    "/sessions/{id}/generate-qr",
    response_model=QRTokenResponse,
    dependencies=[admin_or_dev_required],
)
def generate_qr(
    id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Force rotates/generates a new QR token for a session. (Admin/Developer only)
    """
    return QRService.generate_token(db, session_id=id, creator_id=int(current_user.id))


@router.get(
    "/sessions/{id}/current-qr",
    response_model=QRTokenResponse,
    dependencies=[admin_or_dev_required],
)
def get_current_qr(
    id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Retrieves the current active QR token, rotating automatically if expired. (Admin/Developer only)
    """
    return QRService.get_or_create_current_token(db, session_id=id, creator_id=int(current_user.id))


@router.post(
    "/sessions/{id}/expire-qr",
    response_model=dict,
    dependencies=[admin_or_dev_required],
)
def force_expire_qr(
    id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Force expires/deactivates the current active QR token for a session. (Admin/Developer only)
    """
    db.query(SessionToken).filter(
        SessionToken.session_id == id,
        SessionToken.is_active
    ).update({"is_active": False})
    db.commit()
    return {"status": "success", "message": f"Successfully expired current QR token for session {id}"}


@router.get(
    "/sessions/{id}/qr-history",
    response_model=list[QRTokenResponse],
    dependencies=[admin_or_dev_required],
)
def get_qr_history(id: int, db: Session = Depends(get_db)):
    """
    Fetches the history of QR tokens generated for a session. (Admin/Developer only)
    """
    history = (
        db.query(SessionToken)
        .filter(SessionToken.session_id == id)
        .order_by(SessionToken.created_at.desc())
        .all()
    )
    return history


@router.post("/qr/validate", response_model=QRValidateResponse, dependencies=[any_role_required])
def validate_qr(
    payload: QRValidateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Validates a scanned QR token and retrieves session information. (All authenticated roles)
    """
    validation_res = QRService.validate_token(
        db, token_str=payload.token, user_id=int(current_user.id)
    )

    if not validation_res.get("valid"):
        # Return valid=False response according to schema
        return QRValidateResponse(valid=False)

    return QRValidateResponse(
        valid=True,
        session_id=validation_res.get("session_id"),
        session_title=validation_res.get("session_title"),
        subject=validation_res.get("subject"),
        class_name=validation_res.get("class_name"),
        teacher_name=validation_res.get("teacher_name"),
    )


@router.get("/qr/status/{token}", response_model=dict, dependencies=[any_role_required])
def get_qr_status(token: str, db: Session = Depends(get_db)):
    """
    Checks status of a specific QR token (whether it is active and not expired).
    """
    db_token = db.query(SessionToken).filter(SessionToken.token == token).first()
    if not db_token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")

    now = datetime.now(UTC)
    is_valid = db_token.is_active and db_token.expires_at > now

    return {
        "token": token,
        "is_active": db_token.is_active,
        "expired": db_token.expires_at <= now,
        "valid": is_valid,
    }
