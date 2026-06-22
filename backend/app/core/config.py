import os

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
    SECRET_KEY: str = "some-super-secret-key-change-in-production"

    # JWT configuration
    JWT_SECRET: str = "wUN8QSLOsV4pCRyhXBGLGwNABUPuYJkhtfHXiuUZ7Ke"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 1 day

    # Google Client Credentials
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Admin Account Mapping
    ADMIN_EMAIL: str = "admin@example.com"  # The designated email for the Admin user

    # Cloudinary Config (Only config fields required)
    CLOUDINARY_CLOUD_NAME: str | None = None
    CLOUDINARY_API_KEY: str | None = None
    CLOUDINARY_API_SECRET: str | None = None

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


settings = Settings()
