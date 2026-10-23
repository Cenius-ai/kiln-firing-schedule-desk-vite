"""The signed-in member's own studio profile."""

from fastapi import APIRouter

from ..deps import CurrentMember, SessionDep
from ..schemas import MemberRead, MemberUpdate
from .auth import to_member_read

router = APIRouter(prefix="/api/members", tags=["members"])


@router.get("/me", response_model=MemberRead)
def read_profile(member: CurrentMember) -> MemberRead:
    return to_member_read(member)


@router.patch("/me", response_model=MemberRead)
def update_profile(payload: MemberUpdate, member: CurrentMember, session: SessionDep) -> MemberRead:
    # Only these three fields are writable; email and created_at are never client-settable.
    member.display_name = payload.display_name
    member.studio_role = payload.studio_role
    member.bio = payload.bio
    session.add(member)
    session.commit()
    session.refresh(member)
    return to_member_read(member)
