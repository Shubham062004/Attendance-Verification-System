import os

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENVIRONMENT: str = "development"
    PORT: int = 8000
    DATABASE_URL: str = "postgresql://postgres:postgrespassword@localhost:5432/attendance_db"

    # Security — secrets default to empty strings to support dev config/mypy validation.
    # The validator below ensures they are securely set in production.
    SECRET_KEY: str = ""
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS — comma-separated list of allowed origins
    # Example: "http://localhost:3000,https://yourdomain.com"
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Admin Account Mapping — the email that receives the Admin role on first login
    ADMIN_EMAIL: str = "admin@example.com"

    # Cloudinary (optional — selfie upload disabled when not configured)
    CLOUDINARY_CLOUD_NAME: str | None = None
    CLOUDINARY_API_KEY: str | None = None
    CLOUDINARY_API_SECRET: str | None = None

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ALLOWED_ORIGINS into a list."""
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.is_production:
            if not self.SECRET_KEY or self.SECRET_KEY == "some-super-secret-key-change-in-production":
                raise ValueError("SECRET_KEY must be configured with a secure value in production environment.")
            if not self.JWT_SECRET or self.JWT_SECRET == "some-jwt-secret-key-change-in-production":
                raise ValueError("JWT_SECRET must be configured with a secure value in production environment.")
        return self


settings = Settings()
