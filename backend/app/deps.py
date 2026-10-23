"""Shared FastAPI dependencies."""

from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel import Session

from .config import SESSION_COOKIE
from .db import get_session
from .models import Member
from .security import decode_session_token

SessionDep = Annotated[Session, Depends(get_session)]


def get_current_member(
    session: SessionDep,
    kiln_session: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> Member:
    if not kiln_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    member_id = decode_session_token(kiln_session)
    if member_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired.")
    member = session.get(Member, member_id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    return member


CurrentMember = Annotated[Member, Depends(get_current_member)]
