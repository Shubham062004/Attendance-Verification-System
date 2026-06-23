from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.attendance import AttendanceRecord
from app.models.risk import AttendanceFlag, RiskAssessment, RiskLevel
from app.models.session import AttendanceSession
from app.models.user import User
from app.schemas.risk import (
    AttendanceFlagSchema,
    RiskAssessmentWithFlagsSchema,
    RiskEvaluateRequest,
    RiskOverviewStats,
    RiskReviewRequest,
)
from app.services.risk_service import RiskService
from app.utils.auth import RoleChecker, get_current_user

router = APIRouter(tags=["risk"])

admin_or_dev_required = Depends(RoleChecker(["Admin", "Developer"]))


@router.post(
    "/risk/evaluate",
    response_model=RiskAssessmentWithFlagsSchema,
    dependencies=[admin_or_dev_required],
)
def evaluate_risk(payload: RiskEvaluateRequest, db: Session = Depends(get_db)):
    """
    Evaluate or re-evaluate the risk for a specific attendance record. (Admin/Developer only)
    """
    assessment = RiskService.evaluate_attendance(db, payload.attendance_record_id)
    
    # Hydrate additional details
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == assessment.attendance_record_id).first()
    student = db.query(User).filter(User.id == record.student_id).first() if record else None
    session = db.query(AttendanceSession).filter(AttendanceSession.id == record.session_id).first() if record else None
    flags = db.query(AttendanceFlag).filter(AttendanceFlag.attendance_record_id == assessment.attendance_record_id).all()
    
    return RiskAssessmentWithFlagsSchema(
        id=assessment.id,
        attendance_record_id=assessment.attendance_record_id,
        risk_score=assessment.risk_score,
        risk_level=assessment.risk_level,
        reviewed=assessment.reviewed,
        reviewed_by=assessment.reviewed_by,
        reviewed_at=assessment.reviewed_at,
        notes=assessment.notes,
        created_at=assessment.created_at,
        flags=[AttendanceFlagSchema.model_validate(f) for f in flags],
        student_name=student.name if student else None,
        student_reg_number=student.registration_number if student else None,
        session_title=session.title if session else None,
    )


@router.get("/risk/overview", response_model=RiskOverviewStats, dependencies=[admin_or_dev_required])
def get_risk_overview(db: Session = Depends(get_db)):
    """
    Retrieve overview statistics for all risk assessments.
    """
    total_safe = db.query(RiskAssessment).filter(RiskAssessment.risk_level == RiskLevel.SAFE.value).count()
    total_review = db.query(RiskAssessment).filter(RiskAssessment.risk_level == RiskLevel.REVIEW.value).count()
    total_high_risk = db.query(RiskAssessment).filter(RiskAssessment.risk_level == RiskLevel.HIGH_RISK.value).count()
    pending_reviews = db.query(RiskAssessment).filter(RiskAssessment.reviewed.is_(False)).count()

    return RiskOverviewStats(
        total_safe=total_safe,
        total_review=total_review,
        total_high_risk=total_high_risk,
        pending_reviews=pending_reviews,
    )


@router.get("/risk/flags", response_model=list[AttendanceFlagSchema], dependencies=[admin_or_dev_required])
def get_all_flags(db: Session = Depends(get_db)):
    """
    Retrieve all attendance flags.
    """
    return db.query(AttendanceFlag).order_by(AttendanceFlag.created_at.desc()).all()


@router.get("/risk/high-risk", response_model=list[RiskAssessmentWithFlagsSchema], dependencies=[admin_or_dev_required])
def get_high_risk_assessments(db: Session = Depends(get_db)):
    """
    Retrieve all high-risk assessments.
    """
    assessments = db.query(RiskAssessment).filter(RiskAssessment.risk_level == RiskLevel.HIGH_RISK.value).order_by(RiskAssessment.created_at.desc()).all()
    results = []
    for ass in assessments:
        record = db.query(AttendanceRecord).filter(AttendanceRecord.id == ass.attendance_record_id).first()
        student = db.query(User).filter(User.id == record.student_id).first() if record else None
        session = db.query(AttendanceSession).filter(AttendanceSession.id == record.session_id).first() if record else None
        flags = db.query(AttendanceFlag).filter(AttendanceFlag.attendance_record_id == ass.attendance_record_id).all()
        results.append(
            RiskAssessmentWithFlagsSchema(
                id=ass.id,
                attendance_record_id=ass.attendance_record_id,
                risk_score=ass.risk_score,
                risk_level=ass.risk_level,
                reviewed=ass.reviewed,
                reviewed_by=ass.reviewed_by,
                reviewed_at=ass.reviewed_at,
                notes=ass.notes,
                created_at=ass.created_at,
                flags=[AttendanceFlagSchema.model_validate(f) for f in flags],
                student_name=student.name if student else None,
                student_reg_number=student.registration_number if student else None,
                session_title=session.title if session else None,
            )
        )
    return results


@router.get("/risk/review", response_model=list[RiskAssessmentWithFlagsSchema], dependencies=[admin_or_dev_required])
def get_pending_reviews(db: Session = Depends(get_db)):
    """
    Retrieve all assessments pending review.
    """
    assessments = db.query(RiskAssessment).filter(RiskAssessment.reviewed.is_(False)).order_by(desc(RiskAssessment.created_at)).all()
    results = []
    for ass in assessments:
        record = db.query(AttendanceRecord).filter(AttendanceRecord.id == ass.attendance_record_id).first()
        student = db.query(User).filter(User.id == record.student_id).first() if record else None
        session = db.query(AttendanceSession).filter(AttendanceSession.id == record.session_id).first() if record else None
        flags = db.query(AttendanceFlag).filter(AttendanceFlag.attendance_record_id == ass.attendance_record_id).all()
        results.append(
            RiskAssessmentWithFlagsSchema(
                id=ass.id,
                attendance_record_id=ass.attendance_record_id,
                risk_score=ass.risk_score,
                risk_level=ass.risk_level,
                reviewed=ass.reviewed,
                reviewed_by=ass.reviewed_by,
                reviewed_at=ass.reviewed_at,
                notes=ass.notes,
                created_at=ass.created_at,
                flags=[AttendanceFlagSchema.model_validate(f) for f in flags],
                student_name=student.name if student else None,
                student_reg_number=student.registration_number if student else None,
                session_title=session.title if session else None,
            )
        )
    return results


@router.get("/risk/{attendance_id}", response_model=RiskAssessmentWithFlagsSchema)
def get_risk_by_attendance_id(
    attendance_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve risk assessment and flags for a specific attendance record.
    Students may only view their own; Admin/Developer can view any.
    """
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == attendance_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance record {attendance_id} not found",
        )

    if current_user.role not in ("Admin", "Developer") and int(current_user.id) != record.student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view risk assessment for this record",
        )

    assessment = db.query(RiskAssessment).filter(RiskAssessment.attendance_record_id == attendance_id).first()
    if not assessment:
        # If it doesn't exist, try evaluating it now dynamically
        assessment = RiskService.evaluate_attendance(db, attendance_id)

    student = db.query(User).filter(User.id == record.student_id).first()
    session = db.query(AttendanceSession).filter(AttendanceSession.id == record.session_id).first()
    flags = db.query(AttendanceFlag).filter(AttendanceFlag.attendance_record_id == attendance_id).all()

    return RiskAssessmentWithFlagsSchema(
        id=assessment.id,
        attendance_record_id=assessment.attendance_record_id,
        risk_score=assessment.risk_score,
        risk_level=assessment.risk_level,
        reviewed=assessment.reviewed,
        reviewed_by=assessment.reviewed_by,
        reviewed_at=assessment.reviewed_at,
        notes=assessment.notes,
        created_at=assessment.created_at,
        flags=[AttendanceFlagSchema.model_validate(f) for f in flags],
        student_name=student.name if student else None,
        student_reg_number=student.registration_number if student else None,
        session_title=session.title if session else None,
    )


@router.patch("/risk/{id}/review", response_model=RiskAssessmentWithFlagsSchema, dependencies=[admin_or_dev_required])
def review_risk_assessment(
    id: int,
    payload: RiskReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit a review for a risk assessment, approving or rejecting the attendance. (Admin/Developer only)
    """
    assessment = RiskService.review_assessment(
        db=db,
        assessment_id=id,
        status_choice=payload.status,
        notes=payload.notes,
        reviewer_id=int(current_user.id),
    )

    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == assessment.attendance_record_id).first()
    student = db.query(User).filter(User.id == record.student_id).first() if record else None
    session = db.query(AttendanceSession).filter(AttendanceSession.id == record.session_id).first() if record else None
    flags = db.query(AttendanceFlag).filter(AttendanceFlag.attendance_record_id == assessment.attendance_record_id).all()

    return RiskAssessmentWithFlagsSchema(
        id=assessment.id,
        attendance_record_id=assessment.attendance_record_id,
        risk_score=assessment.risk_score,
        risk_level=assessment.risk_level,
        reviewed=assessment.reviewed,
        reviewed_by=assessment.reviewed_by,
        reviewed_at=assessment.reviewed_at,
        notes=assessment.notes,
        created_at=assessment.created_at,
        flags=[AttendanceFlagSchema.model_validate(f) for f in flags],
        student_name=student.name if student else None,
        student_reg_number=student.registration_number if student else None,
        session_title=session.title if session else None,
    )


class RiskMockRequest(BaseModel):
    scenario_type: str  # "gps_failure" | "missing_verification" | "high_risk" | "generic_review"


@router.post(
    "/risk/mock-scenario",
    response_model=RiskAssessmentWithFlagsSchema,
    dependencies=[admin_or_dev_required],
)
def create_mock_scenario(payload: RiskMockRequest, db: Session = Depends(get_db)):
    """
    Generate a mock attendance submission with specific risk indicators for testing. (Developer/Admin only)
    """
    import random

    from app.models.attendance import AttendanceStatus
    from app.models.evidence import AttendanceEvidence
    from app.models.location import LocationValidation
    from app.models.verification import VerificationSession

    # 1. Find or create mock student
    student_email = f"mock_student_{random.randint(1000, 9999)}@university.edu"
    student = db.query(User).filter(User.role == "Student").first()
    if not student:
        student = User(
            email=student_email,
            name="Simulated Student",
            registration_number=f"REG{random.randint(100000, 999999)}",
            role="Student",
            is_active=True
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    # 2. Find or create session
    session = db.query(AttendanceSession).filter(AttendanceSession.status == "ACTIVE").first()
    if not session:
        session = db.query(AttendanceSession).first()
    if not session:
        session = AttendanceSession(
            title="Introduction to Machine Learning",
            subject="CS-401",
            class_name="Year 4 / Section A",
            status="ACTIVE",
            created_by=student.id,
            start_time=datetime.now(UTC),
            end_time=datetime.now(UTC)
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # 3. Build components based on scenario type
    location_id = None
    verification_id = None
    evidence_id = None

    if payload.scenario_type == "gps_failure":
        # LocationOutsideRadius: +50, PoorGPSAccuracy: +20 = 70 score, HIGH_RISK
        loc = LocationValidation(
            student_id=student.id,
            session_id=session.id,
            latitude=12.9716,
            longitude=77.5946,
            accuracy=55.0,
            distance_from_center=250.0,
            is_within_radius=False,
            risk_score=70
        )
        db.add(loc)
        db.commit()
        db.refresh(loc)
        location_id = loc.id

        ver = VerificationSession(
            student_id=student.id,
            session_id=session.id,
            camera_granted=True,
            face_detected=True,
            blink_verified=True,
            smile_verified=True,
            liveness_passed=True,
            status="PASSED",
            attempt_count=1,
            completed_at=datetime.now(UTC)
        )
        db.add(ver)
        db.commit()
        db.refresh(ver)
        verification_id = ver.id

        ev = AttendanceEvidence(
            student_id=student.id,
            session_id=session.id,
            image_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb",
            image_public_id=f"mock_public_{random.randint(100, 999)}",
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)
        evidence_id = ev.id

    elif payload.scenario_type == "missing_verification":
        # Missing Verification Step: +100 = 100 score, HIGH_RISK
        # We mock this by setting verification_session_id to None
        loc = LocationValidation(
            student_id=student.id,
            session_id=session.id,
            latitude=12.9716,
            longitude=77.5946,
            accuracy=5.0,
            distance_from_center=10.0,
            is_within_radius=True,
            risk_score=0
        )
        db.add(loc)
        db.commit()
        db.refresh(loc)
        location_id = loc.id

        ev = AttendanceEvidence(
            student_id=student.id,
            session_id=session.id,
            image_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb",
            image_public_id=f"mock_public_{random.randint(100, 999)}",
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)
        evidence_id = ev.id

    elif payload.scenario_type == "high_risk":
        # Location Outside Radius: +50, No Blink: +30, No Smile: +30, Multiple Attempts: +40 = 150 score
        loc = LocationValidation(
            student_id=student.id,
            session_id=session.id,
            latitude=12.9716,
            longitude=77.5946,
            accuracy=5.0,
            distance_from_center=180.0,
            is_within_radius=False,
            risk_score=50
        )
        db.add(loc)
        db.commit()
        db.refresh(loc)
        location_id = loc.id

        ver = VerificationSession(
            student_id=student.id,
            session_id=session.id,
            camera_granted=True,
            face_detected=True,
            blink_verified=False,
            smile_verified=False,
            liveness_passed=True,
            status="PASSED",
            attempt_count=3,
            completed_at=datetime.now(UTC)
        )
        db.add(ver)
        db.commit()
        db.refresh(ver)
        verification_id = ver.id

        ev = AttendanceEvidence(
            student_id=student.id,
            session_id=session.id,
            image_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb",
            image_public_id=f"mock_public_{random.randint(100, 999)}",
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)
        evidence_id = ev.id

    else:  # "generic_review"
        # Poor GPS Accuracy (+20), Late Submission (+15) = 35 score, REVIEW level
        loc = LocationValidation(
            student_id=student.id,
            session_id=session.id,
            latitude=12.9716,
            longitude=77.5946,
            accuracy=28.0,
            distance_from_center=8.0,
            is_within_radius=True,
            risk_score=20
        )
        db.add(loc)
        db.commit()
        db.refresh(loc)
        location_id = loc.id

        ver = VerificationSession(
            student_id=student.id,
            session_id=session.id,
            camera_granted=True,
            face_detected=True,
            blink_verified=True,
            smile_verified=True,
            liveness_passed=True,
            status="PASSED",
            attempt_count=1,
            completed_at=datetime.now(UTC)
        )
        db.add(ver)
        db.commit()
        db.refresh(ver)
        verification_id = ver.id

        ev = AttendanceEvidence(
            student_id=student.id,
            session_id=session.id,
            image_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb",
            image_public_id=f"mock_public_{random.randint(100, 999)}",
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)
        evidence_id = ev.id

    # Create Core Attendance Record (must use unique student per session)
    # If the student already submitted attendance for this session, delete it to allow re-submission in tests
    existing_attendance = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student.id,
        AttendanceRecord.session_id == session.id
    ).first()
    if existing_attendance:
        # Delete associated risk records first
        db.query(RiskAssessment).filter(RiskAssessment.attendance_record_id == existing_attendance.id).delete()
        db.query(AttendanceFlag).filter(AttendanceFlag.attendance_record_id == existing_attendance.id).delete()
        db.delete(existing_attendance)
        db.commit()

    record = AttendanceRecord(
        student_id=student.id,
        session_id=session.id,
        location_validation_id=location_id,
        verification_session_id=verification_id,
        evidence_id=evidence_id,
        status=AttendanceStatus.PRESENT.value,
        submitted_at=datetime.now(UTC)
    )
    if payload.scenario_type == "generic_review" and session.end_time:
        from datetime import timedelta
        record.submitted_at = session.end_time + timedelta(minutes=10)

    db.add(record)
    db.commit()
    db.refresh(record)

    # Evaluate Risk using Risk Service
    assessment = RiskService.evaluate_attendance(db, record.id)
    db.refresh(record)

    flags = db.query(AttendanceFlag).filter(AttendanceFlag.attendance_record_id == assessment.attendance_record_id).all()

    return RiskAssessmentWithFlagsSchema(
        id=assessment.id,
        attendance_record_id=assessment.attendance_record_id,
        risk_score=assessment.risk_score,
        risk_level=assessment.risk_level,
        reviewed=assessment.reviewed,
        reviewed_by=assessment.reviewed_by,
        reviewed_at=assessment.reviewed_at,
        notes=assessment.notes,
        created_at=assessment.created_at,
        flags=[AttendanceFlagSchema.model_validate(f) for f in flags],
        student_name=student.name,
        student_reg_number=student.registration_number,
        session_title=session.title,
    )

