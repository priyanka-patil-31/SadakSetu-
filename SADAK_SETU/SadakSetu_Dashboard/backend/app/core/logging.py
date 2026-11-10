import logging

from app.core.config import Settings


def configure_logging(settings: Settings) -> None:
    """Configure one consistent log format for local development and Uvicorn."""

    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        force=True,
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
