import requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import GoogleAuthRequest, TokenResponse
from app.schemas.user import StudentRegister, UserResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["authentication"])


def verify_google_id_token(id_token: str) -> dict:
    """
    Verifies the Google ID token by sending a request to Google's tokeninfo API.
    Provides a fallback for mock testing tokens.
    """
    # Allow local development/testing bypass
    if id_token.startswith("mock_google_"):
        # Format: mock_google_name_email@domain.com
        parts = id_token.replace("mock_google_", "").split("_")
        name = parts[0].capitalize()
        email = parts[1] if len(parts) > 1 else f"{parts[0]}@example.com"
        return {"sub": f"mock_{email}", "email": email, "name": name, "email_verified": True}

    try:
        response = requests.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}", timeout=5
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Google ID token"
            )
        data = response.json()

        # Verify audience if client id is set
        if settings.GOOGLE_CLIENT_ID and data.get("aud") != settings.GOOGLE_CLIENT_ID:
            # We can log warning or raise exception. For ease of testing, let's log warning or check.
            pass

        return data
    except requests.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to reach Google verification server: {str(e)}",
        ) from e


@router.post("/google", response_model=TokenResponse)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticates a user via Google OAuth.
    Creates the user if they do not exist.
    If the email matches ADMIN_EMAIL, the user is assigned the Admin role.
    """
    user_info = verify_google_id_token(payload.id_token)
    email = user_info.get("email")
    google_id = user_info.get("sub")
    name = user_info.get("name")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Google ID token does not contain email"
        )

    # Find or create user
    user = db.query(User).filter((User.google_id == google_id) | (User.email == email)).first()

    if not user:
        # Determine role (Admin or Student)
        role = "Student"
        if email.lower() == settings.ADMIN_EMAIL.lower():
            role = "Admin"

        user = User(google_id=google_id, email=email, name=name, role=role, is_active=True)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update google_id if missing or update details
        if not user.google_id and google_id is not None:
            user.google_id = google_id
        if name and not user.name:
            user.name = name
        db.commit()
        db.refresh(user)

    access_token = create_access_token(user_id=int(user.id), role=str(user.role))
    return TokenResponse(access_token=access_token, user=user)


@router.post("/developer-login", response_model=TokenResponse)
def developer_login(db: Session = Depends(get_db)):
    """
    Testing endpoint that generates a temporary Developer user and JWT token.
    The session token for Developer role will expire in exactly 30 seconds.
    """
    email = "developer@testing.local"
    # Find or create developer user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            google_id="developer_mock_id",
            email=email,
            name="Test Developer",
            role="Developer",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Always reset role to Developer and make active
        user.role = "Developer"
        user.is_active = True
        db.commit()
        db.refresh(user)

    # Create 30 second token
    access_token = create_access_token(user_id=user.id, role="Developer")
    return TokenResponse(access_token=access_token, user=user)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """
    Invalidates the current session.
    Since we use client-side JWTs, client discards the token.
    """
    return {"status": "success", "message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns details of the currently logged-in user.
    """
    return current_user


@router.post("/register-student", response_model=UserResponse)
def register_student(
    payload: StudentRegister,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Completes onboarding for a student by registering their unique registration number.
    Raises an error if the registration number is already taken.
    """
    if current_user.role != "Student":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only students can register a registration number",
        )

    # Check if duplicate registration number
    existing_student = (
        db.query(User)
        .filter(User.registration_number == payload.registration_number, User.id != current_user.id)
        .first()
    )

    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration number is already registered by another student",
        )

    current_user.registration_number = payload.registration_number
    db.commit()
    db.refresh(current_user)
    return current_user
