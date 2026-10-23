"""Runtime configuration for the Kiln Firing Schedule Desk backend.

Every value has a working development default so a fresh clone boots with no
``.env`` file at all. The JWT signing secret is generated once and cached in
``backend/.jwt_secret`` when the environment does not provide one, so the
secret is per-install random rather than a value committed to source control.
"""

import hashlib
import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"


def _load_env_file(path: Path) -> None:
    """Minimal .env reader: real environment variables always win."""
    try:
        raw = path.read_text()
    except FileNotFoundError:
        return
    for line in raw.splitlines():
        entry = line.strip()
        if not entry or entry.startswith("#") or "=" not in entry:
            continue
        key, _, value = entry.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_env_file(BASE_DIR.parent / ".env")
_load_env_file(BASE_DIR / ".env")

DATABASE_URL = os.getenv("KILN_DATABASE_URL") or f"sqlite:///{BASE_DIR / 'kiln.db'}"


DEFAULT_SECRET_FILE = BASE_DIR / ".jwt_secret"


def _confined_secret_path(candidate: Path) -> Path:
    """Resolve the secret file against the backend directory and reject escapes."""
    base = BASE_DIR.resolve()
    resolved = (candidate if candidate.is_absolute() else base / candidate).resolve()
    if base not in resolved.parents:
        return DEFAULT_SECRET_FILE.resolve()
    return resolved


def _load_jwt_secret() -> str:
    """Return the session signing secret, generating and persisting one if needed."""
    from_env = os.getenv("KILN_JWT_SECRET", "").strip()
    if from_env:
        return from_env

    candidate = Path(os.getenv("KILN_JWT_SECRET_FILE") or DEFAULT_SECRET_FILE)
    secret_file = _confined_secret_path(candidate)
    try:
        cached = secret_file.read_text().strip()
    except (FileNotFoundError, OSError):
        cached = ""
    if cached:
        return cached

    generated = secrets.token_hex(32)
    # Defence in depth: the sink only ever receives a path proven to sit under BASE_DIR.
    if BASE_DIR.resolve() not in secret_file.parents:
        raise RuntimeError("refusing to write the session secret outside the backend directory")
    with open(secret_file, "w", encoding="utf-8") as handle:
        handle.write(generated + "\n")
    return generated


def _strengthen_secret(value: str) -> str:
    """HMAC-SHA256 wants at least 32 bytes (RFC 7518 §3.2); expand short secrets."""
    if len(value.encode("utf-8")) >= 32:
        return value
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


JWT_SECRET = _strengthen_secret(_load_jwt_secret())
JWT_ALGORITHM = "HS256"
SESSION_COOKIE = "kiln_session"
SESSION_HOURS = 8

# Studio-local, timezone-naive datetimes are used throughout the app.
SESSION_COOKIE_SECURE = os.getenv("KILN_COOKIE_SECURE", "false").lower() == "true"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "KILN_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
