"""``uvicorn main:app`` entrypoint (kept so both launch spellings work)."""

from app.main import app

__all__ = ["app"]
