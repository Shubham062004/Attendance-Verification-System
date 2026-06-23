from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.audit import AuditLog
from app.models.risk import AttendanceFlag, FlagSeverity, RiskAssessment, RiskLevel
from app.models.session import AttendanceSession
from app.models.user import User
from app.schemas.admin import (
    AdminAttendanceRecordListItem,
    AttendanceAddRequest,
    AttendanceOverrideRequest,
    DashboardStatsResponse,
    StudentAttendanceHistoryItem,
    StudentDetailResponse,
    StudentHistoryResponse,
    TodaySessionOverview,
)
from app.utils.auth import RoleChecker, get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

admin_or_dev_required = Depends(RoleChecker(["Admin", "Developer"]))


@router.get("/attendance", response_model=list[AdminAttendanceRecordListItem], dependencies=[admin_or_dev_required])
def get_all_attendance_records(db: Session = Depends(get_db)):
    """
    Retrieve all attendance records for management table.
    """
    records = db.query(AttendanceRecord).order_by(desc(AttendanceRecord.submitted_at)).all()
    results = []
    for r in records:
        student = db.query(User).filter(User.id == r.student_id).first()
        session = db.query(AttendanceSession).filter(AttendanceSession.id == r.session_id).first()
        assessment = db.query(RiskAssessment).filter(RiskAssessment.attendance_record_id == r.id).first()

        results.append(
            AdminAttendanceRecordListItem(
                id=r.id,
                student_id=r.student_id,
                student_name=student.name if student else "Unknown",
                student_reg_number=student.registration_number if student else "N/A",
                session_id=r.session_id,
                session_title=session.title if session else "Unknown Session",
                status=r.status,
                submitted_at=r.submitted_at,
                risk_score=assessment.risk_score if assessment else None,
                risk_level=assessment.risk_level if assessment else None,
            )
        )
    return results


def log_audit(db: Session, user_id: int, action: str, details: str | None = None) -> None:
    audit = AuditLog(user_id=user_id, action=action, details=details)
    db.add(audit)
    db.commit()


@router.get("/stats", response_model=DashboardStatsResponse, dependencies=[admin_or_dev_required])
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Retrieve real-time KPIs and today's session overview for the Admin dashboard.
    """
    total_students = db.query(User).filter(User.role == "Student").count()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Present today (status is PRESENT or FLAGGED)
    present_today = db.query(AttendanceRecord).filter(
        AttendanceRecord.submitted_at >= today_start,
        AttendanceRecord.status.in_([AttendanceStatus.PRESENT.value, AttendanceStatus.FLAGGED.value])
    ).count()

    absent_today = max(0, total_students - present_today)
    attendance_pct = (present_today / total_students * 100) if total_students > 0 else 0.0

    # Active session status
    active_session = db.query(AttendanceSession).filter(
        AttendanceSession.status.in_(["ACTIVE", "REOPENED"])
    ).first()
    active_status = active_session.status if active_session else "NONE"

    pending_risk_reviews = db.query(RiskAssessment).filter(RiskAssessment.reviewed.is_(False)).count()
    total_records = db.query(AttendanceRecord).count()

    # Get sessions created today (or fallbacks)
    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.created_at >= today_start
    ).all()
    if not sessions:
        sessions = db.query(AttendanceSession).order_by(desc(AttendanceSession.created_at)).limit(5).all()

    today_sessions = []
    for s in sessions:
        pres = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == s.id,
            AttendanceRecord.status.in_([AttendanceStatus.PRESENT.value, AttendanceStatus.FLAGGED.value])
        ).count()
        abs_count = max(0, total_students - pres)
        pct = (pres / total_students * 100) if total_students > 0 else 0.0

        today_sessions.append(
            TodaySessionOverview(
                id=s.id,
                title=s.title,
                subject=s.subject,
                class_name=s.class_name,
                start_time=s.start_time,
                end_time=s.end_time,
                status=s.status,
                present_count=pres,
                absent_count=abs_count,
                attendance_percentage=pct,
            )
        )

    return DashboardStatsResponse(
        total_students=total_students,
        present_today=present_today,
        absent_today=absent_today,
        attendance_percentage_today=attendance_pct,
        active_session_status=active_status,
        pending_risk_reviews=pending_risk_reviews,
        total_attendance_records=total_records,
        today_sessions=today_sessions,
    )


@router.get("/students", response_model=list[StudentHistoryResponse], dependencies=[admin_or_dev_required])
def get_students_history(db: Session = Depends(get_db)):
    """
    List all students with aggregate attendance stats.
    """
    students = db.query(User).filter(User.role == "Student").all()
    total_sessions = db.query(AttendanceSession).count()

    results = []
    for s in students:
        present = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == s.id,
            AttendanceRecord.status.in_([AttendanceStatus.PRESENT.value, AttendanceStatus.FLAGGED.value])
        ).count()
        absent = max(0, total_sessions - present)
        pct = (present / total_sessions * 100) if total_sessions > 0 else 100.0

        last_rec = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == s.id
        ).order_by(desc(AttendanceRecord.submitted_at)).first()

        results.append(
            StudentHistoryResponse(
                id=s.id,
                name=s.name,
                email=s.email,
                registration_number=s.registration_number,
                attendance_percentage=pct,
                present_count=present,
                absent_count=absent,
                last_attendance=last_rec.submitted_at if last_rec else None,
            )
        )
    return results


@router.get("/students/{id}", response_model=StudentDetailResponse, dependencies=[admin_or_dev_required])
def get_student_detail(id: int, db: Session = Depends(get_db)):
    """
    Retrieve single student profile, timeline, and risk flags history.
    """
    student = db.query(User).filter(User.id == id, User.role == "Student").first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    sessions = db.query(AttendanceSession).order_by(desc(AttendanceSession.created_at)).all()
    total_sessions = len(sessions)

    present_count = 0
    history_items = []

    for s in sessions:
        record = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == id,
            AttendanceRecord.session_id == s.id
        ).first()

        if record:
            status_label = record.status
            if status_label in (AttendanceStatus.PRESENT.value, AttendanceStatus.FLAGGED.value):
                present_count += 1
            
            assessment = db.query(RiskAssessment).filter(RiskAssessment.attendance_record_id == record.id).first()
            
            history_items.append(
                StudentAttendanceHistoryItem(
                    id=record.id,
                    session_id=s.id,
                    session_title=s.title,
                    session_subject=s.subject,
                    submitted_at=record.submitted_at,
                    status=status_label,
                    risk_score=assessment.risk_score if assessment else None,
                    risk_level=assessment.risk_level if assessment else None,
                    notes=assessment.notes if assessment else None,
                )
            )
        else:
            history_items.append(
                StudentAttendanceHistoryItem(
                    id=None,
                    session_id=s.id,
                    session_title=s.title,
                    session_subject=s.subject,
                    submitted_at=None,
                    status="ABSENT",
                    risk_score=None,
                    risk_level=None,
                    notes=None,
                )
            )

    absent_count = max(0, total_sessions - present_count)
    pct = (present_count / total_sessions * 100) if total_sessions > 0 else 100.0

    return StudentDetailResponse(
        id=student.id,
        name=student.name,
        email=student.email,
        registration_number=student.registration_number,
        attendance_percentage=pct,
        present_sessions=present_count,
        absent_sessions=absent_count,
        total_sessions=total_sessions,
        history=history_items,
    )


@router.post("/attendance/add", dependencies=[admin_or_dev_required])
def add_attendance_manually(
    payload: AttendanceAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually create an attendance record for a student+session. (Admin/Developer only)
    """
    # Check if record already exists
    existing = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == payload.student_id,
        AttendanceRecord.session_id == payload.session_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student already has an attendance record for this session."
        )

    record = AttendanceRecord(
        student_id=payload.student_id,
        session_id=payload.session_id,
        status=payload.status,
        submitted_at=datetime.utcnow()
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Initialize associated risk assessment as SAFE/Reviewed
    assessment = RiskAssessment(
        attendance_record_id=record.id,
        risk_score=0,
        risk_level=RiskLevel.SAFE.value,
        reviewed=True,
        reviewed_by=int(current_user.id),
        reviewed_at=datetime.utcnow(),
        notes=payload.notes or "Manually added by Admin"
    )
    db.add(assessment)
    db.commit()

    log_audit(
        db,
        user_id=int(current_user.id),
        action="Attendance Added",
        details=f"Manually marked student {payload.student_id} as {payload.status} for session {payload.session_id}."
    )

    return {"message": "Attendance record created successfully", "record_id": record.id}


@router.post("/attendance/{id}/override", dependencies=[admin_or_dev_required])
def override_attendance_record(
    id: int,
    payload: AttendanceOverrideRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Override an existing attendance record status and risk assessment. (Admin/Developer only)
    """
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")

    old_status = record.status
    record.status = payload.status

    # Retrieve or create risk assessment
    assessment = db.query(RiskAssessment).filter(RiskAssessment.attendance_record_id == id).first()
    if not assessment:
        assessment = RiskAssessment(attendance_record_id=id)
        db.add(assessment)

    assessment.reviewed = True
    assessment.reviewed_by = int(current_user.id)
    assessment.reviewed_at = datetime.utcnow()
    assessment.notes = payload.notes or f"Overridden status to {payload.status} by Admin."

    # If technical issue flag is set, create a technical issue flag
    if payload.is_technical_issue:
        flag = AttendanceFlag(
            attendance_record_id=id,
            flag_type="TECHNICAL_ISSUE",
            flag_reason=payload.notes or "Flagged as technical issue by Admin override",
            severity=FlagSeverity.LOW.value
        )
        db.add(flag)
        log_audit(
            db,
            user_id=int(current_user.id),
            action="Technical Issue Added",
            details=f"Flagged attendance record #{id} with technical issue."
        )

    db.commit()

    log_audit(
        db,
        user_id=int(current_user.id),
        action="Attendance Updated",
        details=f"Updated record #{id} status from {old_status} to {payload.status}."
    )
    log_audit(
        db,
        user_id=int(current_user.id),
        action="Risk Overridden",
        details=f"Overrode risk assessment flags for record #{id}."
    )
    if payload.notes:
        log_audit(
            db,
            user_id=int(current_user.id),
            action="Note Added",
            details=f"Added admin review notes: '{payload.notes}'"
        )

    return {"message": "Attendance record status successfully overridden"}


@router.delete("/attendance/{id}", dependencies=[admin_or_dev_required])
def remove_attendance_record(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an attendance record and associated risk entries. (Admin/Developer only)
    """
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")

    # Delete risk assessments & flags
    db.query(RiskAssessment).filter(RiskAssessment.attendance_record_id == id).delete()
    db.query(AttendanceFlag).filter(AttendanceFlag.attendance_record_id == id).delete()

    db.delete(record)
    db.commit()

    log_audit(
        db,
        user_id=int(current_user.id),
        action="Attendance Removed",
        details=f"Removed attendance record ID #{id} for student ID {record.student_id}."
    )

    return {"message": "Attendance record successfully removed"}
