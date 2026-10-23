"""Sign-in, sign-out and session introspection."""

from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response, status
from sqlmodel import func, select

from ..config import SESSION_COOKIE, SESSION_HOURS
from ..deps import CurrentMember, SessionDep
from ..models import Member
from ..schemas import LoginRequest, MemberRead, SessionStatus
from ..security import burn_password_check, create_session_token, decode_session_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

INVALID_CREDENTIALS = "Email or password is incorrect."


def to_member_read(member: Member) -> MemberRead:
    return MemberRead(
        id=member.id,
        email=member.email,
        display_name=member.display_name,
        studio_role=member.studio_role,
        bio=member.bio,
        created_at=member.created_at,
    )


@router.post("/login", response_model=MemberRead)
def login(payload: LoginRequest, response: Response, session: SessionDep) -> MemberRead:
    email = payload.email.strip().lower()
    member = session.execute(select(Member).where(func.lower(Member.email) == email)).scalars().first()

    if member is None:
        burn_password_check(payload.password)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CREDENTIALS)

    if not verify_password(payload.password, member.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CREDENTIALS)

    response.set_cookie(
        key=SESSION_COOKIE,
        value=create_session_token(member.id),
        max_age=SESSION_HOURS * 3600,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )
    return to_member_read(member)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    # Cookies set on the injected Response are copied onto the real 204 response.
    response.delete_cookie(SESSION_COOKIE, path="/")


@router.get("/me", response_model=MemberRead)
def read_me(member: CurrentMember) -> MemberRead:
    return to_member_read(member)


@router.get("/session", response_model=SessionStatus)
def read_session(
    session: SessionDep,
    kiln_session: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> SessionStatus:
    """Used by the SPA on boot: 200 with a flag instead of a 401 in the console."""
    if not kiln_session:
        return SessionStatus(authenticated=False)
    member_id = decode_session_token(kiln_session)
    member = session.get(Member, member_id) if member_id is not None else None
    if member is None:
        return SessionStatus(authenticated=False)
    return SessionStatus(authenticated=True, member=to_member_read(member))
