from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.attendance import router as attendance_router
from app.api.audit import router as audit_router
from app.api.auth import router as auth_router
from app.api.evidence import router as evidence_router
from app.api.health import router as health_router
from app.api.location import router as location_router
from app.api.qr import router as qr_router
from app.api.reports import router as reports_router
from app.api.risk import router as risk_router
from app.api.sessions import router as sessions_router
from app.api.users import router as users_router
from app.api.verification import router as verification_router
from app.core.cloudinary import configure_cloudinary
from app.core.config import settings
from app.core.logging import logger, setup_logging
from app.middleware.audit import AuditMiddleware

# Setup logger configuration
setup_logging()

# Initialize external services
configure_cloudinary()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown logic."""
    logger.info("Starting up Smart Attendance API v1.0.0 ...")
    yield
    logger.info("Shutting down Smart Attendance API ...")


app = FastAPI(
    title="Smart Attendance Verification API",
    description=(
        "Production-grade API for the Smart Attendance Verification System. "
        "Handles authentication, session management, QR generation, multi-factor "
        "attendance verification (location + blink + smile), risk assessment, "
        "reporting, audit logging, and weather-aware success experiences."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    contact={
        "name": "Smart Attendance System",
        "url": "https://github.com/Shubham062004/Attendance-Verification-System",
    },
    license_info={
        "name": "MIT",
    },
)

# CORS — sourced from settings (configurable per environment)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditMiddleware)

# Register routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(sessions_router)
app.include_router(qr_router)
app.include_router(location_router)
app.include_router(verification_router)
app.include_router(evidence_router)
app.include_router(attendance_router)
app.include_router(risk_router)
app.include_router(admin_router)
app.include_router(reports_router)
app.include_router(audit_router)
