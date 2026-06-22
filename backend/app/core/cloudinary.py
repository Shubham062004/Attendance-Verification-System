import cloudinary

from app.core.config import settings
from app.core.logging import logger


def configure_cloudinary() -> None:
    if all(
        [
            settings.CLOUDINARY_CLOUD_NAME,
            settings.CLOUDINARY_API_KEY,
            settings.CLOUDINARY_API_SECRET,
        ]
    ):
        try:
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True,
            )
            logger.info("Cloudinary configured successfully.")
        except Exception as e:
            logger.error(f"Failed to configure Cloudinary: {e}")
    else:
        logger.warning("Cloudinary parameters not fully set. Cloudinary integration is disabled.")
