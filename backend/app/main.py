from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
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

# Register health check router
app.include_router(health_router)


@app.on_event("startup")
async def startup_event():
    logger.info("Starting up Smart Attendance API...")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Smart Attendance API...")
