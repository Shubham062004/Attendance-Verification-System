import logging
import sys

from app.core.config import settings


def setup_logging() -> None:
    # Basic logging setup
    logging_level = logging.INFO
    if settings.ENVIRONMENT == "development":
        logging_level = logging.DEBUG

    logging.basicConfig(
        level=logging_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    # Suppress verbose standard loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


logger = logging.getLogger("attendance-api")
