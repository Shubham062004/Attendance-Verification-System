from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.attendance import (
    AttendanceRecordResponse,
    AttendanceSubmitRequest,
    AttendanceSubmitResponse,
    SessionAttendanceSummary,
)
from app.services.attendance_service import AttendanceService
from app.utils.auth import RoleChecker, get_current_user

router = APIRouter(tags=["attendance"])

admin_or_dev_required = Depends(RoleChecker(["Admin", "Developer"]))


@router.post(
    "/attendance/submit",
    response_model=AttendanceSubmitResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_attendance(
    payload: AttendanceSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark attendance for the authenticated student.
    Validates all prerequisites: active session, location, liveness, and selfie evidence.
    Prevents duplicate submissions (one per student per session).
    """
    return AttendanceService.submit(
        db=db,
        session_id=payload.session_id,
        student_id=int(current_user.id),
    )


@router.get("/attendance/{id}", response_model=AttendanceRecordResponse)
def get_attendance_record(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve a single attendance record by ID.
    Students may only view their own records; Admin/Developer can view any.
    """
    record = AttendanceService.get_record_by_id(db, id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance record {id} not found",
        )
    if current_user.role not in ("Admin", "Developer") and int(current_user.id) != record.student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this attendance record",
        )
    return record


@router.get(
    "/attendance/session/{session_id}",
    response_model=SessionAttendanceSummary,
    dependencies=[admin_or_dev_required],
)
def get_session_attendance(
    session_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieve all attendance records and summary stats for a session. (Admin/Developer only)
    """
    return AttendanceService.get_session_attendance(db, session_id)


@router.get("/attendance/student/{student_id}", response_model=list[AttendanceRecordResponse])
def get_student_attendance(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve all attendance records for a student.
    Students may only view their own history; Admin/Developer can view any student.
    """
    if current_user.role not in ("Admin", "Developer") and int(current_user.id) != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this student's attendance history",
        )
    return AttendanceService.get_student_attendance(db, student_id)
