from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.location import (
    ClassroomLocationCreate,
    ClassroomLocationResponse,
    LocationValidationRequest,
    LocationValidationResponse,
)
from app.services.location_service import LocationService
from app.utils.auth import RoleChecker, get_current_user

router = APIRouter(tags=["location"])

admin_or_dev_required = Depends(RoleChecker(["Admin", "Developer"]))


@router.post("/sessions/{id}/location", response_model=ClassroomLocationResponse, dependencies=[admin_or_dev_required])
def configure_classroom_location(
    id: int,
    payload: ClassroomLocationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Configures or updates classroom center coordinates and allowed radius for a session. (Admin/Developer only)
    """
    return LocationService.configure_classroom_location(
        db=db,
        session_id=id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        allowed_radius=payload.allowed_radius,
        user_id=int(current_user.id),
    )


@router.get("/sessions/{id}/location", response_model=ClassroomLocationResponse)
def get_classroom_location(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves the configured classroom coordinates and allowed radius for a session. (All authenticated users)
    """
    loc = LocationService.get_classroom_location(db, id)
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Classroom location configuration not found for session ID {id}"
        )
    return loc


@router.post("/location/validate", response_model=LocationValidationResponse)
def validate_student_location(
    payload: LocationValidationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Validates a student's coordinate submission against a session's coordinates.
    Stores and returns the location validation result.
    """
    return LocationService.validate_student_location(
        db=db,
        session_id=payload.session_id,
        student_id=int(current_user.id),
        latitude=payload.latitude,
        longitude=payload.longitude,
        accuracy=payload.accuracy,
    )


@router.get("/location/session/{session_id}", response_model=list[LocationValidationResponse], dependencies=[admin_or_dev_required])
def get_location_validations_by_session(
    session_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieves all location validation records for a given session. (Admin/Developer only)
    """
    return LocationService.get_session_validations(db, session_id)


@router.get("/location/student/{student_id}", response_model=list[LocationValidationResponse])
def get_location_validations_by_student(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves location validation records for a student.
    A student can only fetch their own records. Admins/Developers can fetch any student's records.
    """
    if current_user.role not in ["Admin", "Developer"] and int(current_user.id) != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this student's location validation history"
        )
    return LocationService.get_student_validations(db, student_id)


@router.get("/location/validation/{id}", response_model=LocationValidationResponse)
def get_location_validation_by_id(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves details of a specific location validation record.
    A student can only fetch their own validation record. Admins/Developers can fetch any validation record.
    """
    val = LocationService.get_validation_by_id(db, id)
    if not val:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location validation record with ID {id} not found"
        )

    if current_user.role not in ["Admin", "Developer"] and int(current_user.id) != val.student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this location validation record"
        )
    return val
