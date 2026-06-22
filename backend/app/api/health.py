from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.logging import logger
from app.db.session import get_db

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check(db: Session = Depends(get_db)):
    """
    Checks the status of the API service and its connection to the database.
    """
    try:
        # Perform simple query on database to test connectivity
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception as e:
        logger.error(f"Database connection error during health check: {e}")
        db_connected = False

    if not db_connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "unhealthy", "service": "attendance-api", "database": "disconnected"},
        )

    return {"status": "healthy", "service": "attendance-api"}
