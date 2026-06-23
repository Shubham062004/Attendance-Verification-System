import math

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.location import ClassroomLocation, LocationValidation
from app.models.session import AttendanceSession


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


class LocationService:
    @staticmethod
    def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great-circle distance between two points on the Earth's surface
        using the Haversine formula. Returns distance in meters.
        """
        # Earth's radius in meters
        r = 6371000.0

        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(phi2 - phi1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

        return r * c

    @staticmethod
    def configure_classroom_location(
        db: Session, session_id: int, latitude: float, longitude: float, allowed_radius: float, user_id: int
    ) -> ClassroomLocation:
        """
        Configure or update the classroom location settings for a specific session.
        """
        session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attendance session with ID {session_id} not found"
            )

        # Check if settings already exist
        loc_config = db.query(ClassroomLocation).filter(ClassroomLocation.session_id == session_id).first()

        if loc_config:
            loc_config.latitude = latitude
            loc_config.longitude = longitude
            loc_config.allowed_radius = allowed_radius
        else:
            loc_config = ClassroomLocation(
                session_id=session_id,
                latitude=latitude,
                longitude=longitude,
                allowed_radius=allowed_radius
            )
            db.add(loc_config)

        db.commit()
        db.refresh(loc_config)

        log_audit(
            db,
            user_id=user_id,
            action="Location Settings Updated",
            details=f"Configured classroom coordinates ({latitude}, {longitude}) with radius {allowed_radius}m for session ID {session_id}"
        )

        return loc_config

    @staticmethod
    def get_classroom_location(db: Session, session_id: int) -> ClassroomLocation | None:
        """
        Retrieve classroom location configurations for a session.
        """
        return db.query(ClassroomLocation).filter(ClassroomLocation.session_id == session_id).first()

    @staticmethod
    def validate_student_location(
        db: Session,
        session_id: int,
        student_id: int,
        latitude: float | None = None,
        longitude: float | None = None,
        accuracy: float | None = None,
    ) -> LocationValidation:
        """
        Validate student location against classroom boundaries and calculate risk score.
        Stores the result in the database.
        """
        session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID {session_id} not found"
            )

        classroom_loc = db.query(ClassroomLocation).filter(ClassroomLocation.session_id == session_id).first()
        if not classroom_loc:
            # If classroom location is not configured, default to a lenient validation or warn.
            # Here we require classroom location to be set for verification to proceed.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Classroom location settings not configured for session ID {session_id}"
            )

        # Risk scoring variables
        risk_score = 0
        is_within_radius = False
        distance_from_center = None

        # Check for missing location coordinates
        if latitude is None or longitude is None or accuracy is None:
            risk_score = 100
            is_within_radius = False
            log_action = "Validation Failed"
            log_details = f"Location coordinates missing for student ID {student_id}"
        else:
            # Calculate distance using Haversine
            distance_from_center = LocationService.calculate_haversine_distance(
                latitude, longitude, classroom_loc.latitude, classroom_loc.longitude
            )

            is_within_radius = distance_from_center <= classroom_loc.allowed_radius

            if not is_within_radius:
                risk_score += 50

            # GPS accuracy rules
            if accuracy > 100.0:
                risk_score += 40
            elif accuracy > 50.0:
                risk_score += 20

            log_action = "Validation Passed" if (is_within_radius and accuracy <= 50.0) else "Validation Flagged"
            log_details = (
                f"Student ID {student_id} validated. Distance: {distance_from_center:.1f}m. "
                f"Accuracy: {accuracy:.1f}m. Risk Score: {risk_score}"
            )

        # Record validation log in database
        validation_log = LocationValidation(
            student_id=student_id,
            session_id=session_id,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            distance_from_center=distance_from_center,
            is_within_radius=is_within_radius,
            risk_score=risk_score
        )
        db.add(validation_log)
        db.commit()
        db.refresh(validation_log)

        # Log to audit logs
        log_audit(
            db,
            user_id=student_id,
            action="Location Captured",
            details=f"Captured coordinate: ({latitude}, {longitude}) with accuracy {accuracy}m for session ID {session_id}"
        )
        log_audit(
            db,
            user_id=student_id,
            action=f"Location {log_action}",
            details=log_details
        )

        return validation_log

    @staticmethod
    def get_session_validations(db: Session, session_id: int) -> list[LocationValidation]:
        """
        Fetch all location validations for a session.
        """
        return db.query(LocationValidation).filter(LocationValidation.session_id == session_id).all()

    @staticmethod
    def get_student_validations(db: Session, student_id: int) -> list[LocationValidation]:
        """
        Fetch all location validations for a student.
        """
        return db.query(LocationValidation).filter(LocationValidation.student_id == student_id).all()

    @staticmethod
    def get_validation_by_id(db: Session, validation_id: int) -> LocationValidation | None:
        """
        Fetch location validation by ID.
        """
        return db.query(LocationValidation).filter(LocationValidation.id == validation_id).first()
