"""Password hashing (bcrypt, cost 12) and JWT session tokens (PyJWT HS256)."""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from .config import JWT_ALGORITHM, JWT_SECRET, SESSION_HOURS

BCRYPT_ROUNDS = 12
# A pre-computed hash used to keep the failed-login path's timing similar when
# the email does not exist at all.
_DUMMY_HASH = bcrypt.hashpw(b"kiln-desk-dummy-password", bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def burn_password_check(password: str) -> None:
    """Run a bcrypt comparison against a throwaway hash (constant-ish login timing)."""
    verify_password(password, _DUMMY_HASH)


def create_session_token(member_id: int) -> str:
    issued_at = datetime.now(timezone.utc)
    payload = {
        "sub": str(member_id),
        "iat": issued_at,
        "exp": issued_at + timedelta(hours=SESSION_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_session_token(token: str) -> int | None:
    """Return the member id encoded in a valid token, or None."""
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError:
        return None

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject.isdigit():
        return None
    return int(subject)
