"""Studio kilns — used by every selector in the app."""

from fastapi import APIRouter
from sqlmodel import select

from ..deps import CurrentMember, SessionDep
from ..models import Kiln
from ..schemas import KilnRead

router = APIRouter(prefix="/api/kilns", tags=["kilns"])


def to_kiln_read(kiln: Kiln) -> KilnRead:
    return KilnRead(
        id=kiln.id,
        name=kiln.name,
        kiln_type=kiln.kiln_type,
        max_cone=kiln.max_cone,
        notes=kiln.notes,
    )


@router.get("", response_model=list[KilnRead])
def list_kilns(session: SessionDep, _member: CurrentMember) -> list[KilnRead]:
    kilns = session.execute(select(Kiln).order_by(Kiln.id)).scalars().all()
    return [to_kiln_read(kiln) for kiln in kilns]
