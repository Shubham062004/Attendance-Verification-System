import random
import string
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.session import AttendanceSession
from app.models.user import User
from app.schemas.session import SessionCreate, SessionResponse, SessionStats, SessionUpdate
from app.utils.auth import RoleChecker, get_current_user

router = APIRouter(prefix="/sessions", tags=["sessions"])


def log_audit(db: Session, user_id: int, action: str, details: str | None = None) -> None:
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


def generate_unique_session_code(db: Session) -> str:
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        exists = db.query(AttendanceSession).filter(AttendanceSession.session_code == code).first()
        if not exists:
            return code


# Admin & Developer role dependencies
admin_or_dev_required = Depends(RoleChecker(["Admin", "Developer"]))
any_role_required = Depends(get_current_user)


@router.post("", response_model=SessionResponse, dependencies=[admin_or_dev_required])
def create_session(
    payload: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates a new attendance session in DRAFT state. (Admin/Developer only)
    """
    if payload.start_time and payload.end_time:
        if payload.end_time <= payload.start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="End time must be after start time"
            )

    session = AttendanceSession(
        title=payload.title,
        subject=payload.subject,
        class_name=payload.class_name,
        description=payload.description,
        start_time=payload.start_time,
        end_time=payload.end_time,
        status="DRAFT",
        created_by=int(current_user.id),
    )
    db.add(session)
    db.commit()
    db.refresh(session)



    return session


@router.get("", response_model=list[SessionResponse], dependencies=[admin_or_dev_required])
def list_sessions(
    q: str | None = Query(None, description="Search query in title, subject, class_name"),
    status_filter: str | None = Query(
        None, alias="status", description="Filter by status (DRAFT, ACTIVE, ENDED, REOPENED)"
    ),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Lists all attendance sessions with search, status filters, and pagination. (Admin/Developer only)
    """
    query = db.query(AttendanceSession)

    if q:
        query = query.filter(
            or_(
                AttendanceSession.title.ilike(f"%{q}%"),
                AttendanceSession.subject.ilike(f"%{q}%"),
                AttendanceSession.class_name.ilike(f"%{q}%"),
            )
        )

    if status_filter:
        query = query.filter(AttendanceSession.status == status_filter.upper())

    # Order by created_at desc
    query = query.order_by(AttendanceSession.created_at.desc())

    # Pagination
    offset = (page - 1) * size
    sessions = query.offset(offset).limit(size).all()
    return sessions


@router.get("/active", response_model=SessionResponse | None)
def get_active_session(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Fetches the currently ACTIVE or REOPENED attendance session. (All authenticated roles)
    """
    session = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.status.in_(["ACTIVE", "REOPENED"]))
        .order_by(AttendanceSession.start_time.desc())
        .first()
    )

    return session


@router.get("/stats", response_model=SessionStats, dependencies=[admin_or_dev_required])
def get_session_stats(db: Session = Depends(get_db)):
    """
    Retrieves global statistics of sessions. (Admin/Developer only)
    """
    total = db.query(AttendanceSession).count()
    active = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.status.in_(["ACTIVE", "REOPENED"]))
        .count()
    )
    ended = db.query(AttendanceSession).filter(AttendanceSession.status == "ENDED").count()
    draft = db.query(AttendanceSession).filter(AttendanceSession.status == "DRAFT").count()

    return SessionStats(total=total, active=active, ended=ended, draft=draft)


@router.get("/{id}", response_model=SessionResponse)
def get_session_by_id(
    id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Retrieves details of a specific session. (All authenticated roles)
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Session with ID {id} not found"
        )
    return session


@router.patch("/{id}", response_model=SessionResponse, dependencies=[admin_or_dev_required])
def update_session(
    id: int,
    payload: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Edits a specific session. (Admin/Developer only)
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Session with ID {id} not found"
        )

    # If start/end times are updated, validate
    new_start = payload.start_time if payload.start_time is not None else session.start_time
    new_end = payload.end_time if payload.end_time is not None else session.end_time

    if new_start and new_end:
        if new_end <= new_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="End time must be after start time"
            )

    # Apply updates
    if payload.title is not None:
        session.title = payload.title
    if payload.subject is not None:
        session.subject = payload.subject
    if payload.class_name is not None:
        session.class_name = payload.class_name
    if payload.description is not None:
        session.description = payload.description
    if payload.start_time is not None:
        session.start_time = payload.start_time
    if payload.end_time is not None:
        session.end_time = payload.end_time

    db.commit()
    db.refresh(session)



    return session


@router.delete("/{id}", dependencies=[admin_or_dev_required])
def delete_session(
    id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Deletes a session. (Admin/Developer only)
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Session with ID {id} not found"
        )

    db.delete(session)
    db.commit()



    return {"status": "success", "message": f"Successfully deleted session {id}"}


@router.post("/{id}/start", response_model=SessionResponse, dependencies=[admin_or_dev_required])
def start_session(
    id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Starts a session: status transitions from DRAFT to ACTIVE.
    Generates a 6-character code and updates start_time to now.
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Session with ID {id} not found"
        )

    if session.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start a session in {session.status} state. Session must be a DRAFT.",
        )

    session.status = "ACTIVE"
    session.session_code = generate_unique_session_code(db)
    session.start_time = datetime.now(UTC)
    db.commit()
    db.refresh(session)



    return session


@router.post("/{id}/end", response_model=SessionResponse, dependencies=[admin_or_dev_required])
def end_session(
    id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Ends an active or reopened session. Status transitions to ENDED.
    Updates end_time to now.
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Session with ID {id} not found"
        )

    if session.status not in ["ACTIVE", "REOPENED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot end session in {session.status} state. Session must be ACTIVE or REOPENED.",
        )

    session.status = "ENDED"
    session.end_time = datetime.now(UTC)
    db.commit()
    db.refresh(session)



    return session


@router.post("/{id}/reopen", response_model=SessionResponse, dependencies=[admin_or_dev_required])
def reopen_session(
    id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Reopens an ended session. Status transitions from ENDED to REOPENED.
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Session with ID {id} not found"
        )

    if session.status != "ENDED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reopen session in {session.status} state. Session must be ENDED.",
        )

    session.status = "REOPENED"
    db.commit()
    db.refresh(session)



    return session
