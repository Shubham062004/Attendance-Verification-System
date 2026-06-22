from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.evidence import router as evidence_router
from app.api.health import router as health_router
from app.api.location import router as location_router
from app.api.qr import router as qr_router
from app.api.sessions import router as sessions_router
from app.api.users import router as users_router
from app.api.verification import router as verification_router
from app.core.cloudinary import configure_cloudinary
from app.core.config import settings
from app.core.logging import logger, setup_logging

# Setup logger configuration
setup_logging()

# Initialize external services
configure_cloudinary()

app = FastAPI(
    title="Smart Attendance Verification API",
    description="Production-grade API for attendance verification system.",
    version="0.1.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(sessions_router)
app.include_router(qr_router)
app.include_router(location_router)
app.include_router(verification_router)
app.include_router(evidence_router)


@app.on_event("startup")
async def startup_event():
    logger.info("Starting up Smart Attendance API...")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Smart Attendance API...")
