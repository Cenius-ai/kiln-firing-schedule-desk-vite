"""Firing schedule: computed cooldown windows and same-kiln overlap protection."""

from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from ..deps import CurrentMember, SessionDep
from ..models import Firing, Kiln, Member
from ..schemas import FiringCreate, FiringRead, FiringUpdate

router = APIRouter(prefix="/api/firings", tags=["firings"])

DT_FORMAT = "%Y-%m-%d %H:%M"


def _parse_month(month: str) -> tuple[datetime, datetime]:
    try:
        start = datetime.strptime(month, "%Y-%m")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=[{"loc": ["query", "month"], "msg": "month must be YYYY-MM", "type": "value_error"}],
        ) from exc
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def _get_kiln(session: SessionDep, kiln_id: int) -> Kiln:
    kiln = session.get(Kiln, kiln_id)
    if kiln is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=[{"loc": ["body", "kiln_id"], "msg": "Unknown kiln.", "type": "value_error"}],
        )
    return kiln


def _occupied_until(firing: Firing) -> datetime:
    return firing.scheduled_start + timedelta(hours=firing.duration_hours + firing.cooldown_hours)


def _ensure_no_conflict(
    session: SessionDep,
    kiln: Kiln,
    start: datetime,
    duration_hours: float,
    cooldown_hours: float,
    exclude_id: int | None = None,
) -> None:
    """Reject a booking that collides with another firing or its cooling window."""
    end = start + timedelta(hours=duration_hours + cooldown_hours)
    same_kiln = session.execute(select(Firing).where(Firing.kiln_id == kiln.id)).scalars().all()
    for other in same_kiln:
        if exclude_id is not None and other.id == exclude_id:
            continue
        other_start = other.scheduled_start
        other_end = _occupied_until(other)
        if start < other_end and other_start < end:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"{kiln.name} is already booked by “{other.title}” from "
                    f"{other_start.strftime(DT_FORMAT)} until {other_end.strftime(DT_FORMAT)} "
                    "(firing plus cooldown). Pick a start after that window."
                ),
            )


def to_firing_read(firing: Firing, kiln: Kiln, member: Member | None) -> FiringRead:
    return FiringRead(
        id=firing.id,
        kiln_id=firing.kiln_id,
        kiln_name=kiln.name,
        created_by=firing.created_by,
        created_by_name=member.display_name if member else "Former member",
        title=firing.title,
        target_cone=firing.target_cone,
        scheduled_start=firing.scheduled_start,
        duration_hours=firing.duration_hours,
        cooldown_hours=firing.cooldown_hours,
        cooldown_start=firing.cooldown_start,
        cooldown_end=firing.cooldown_end,
        notes=firing.notes,
    )


def _read_one(session: SessionDep, firing: Firing) -> FiringRead:
    kiln = session.get(Kiln, firing.kiln_id)
    member = session.get(Member, firing.created_by)
    return to_firing_read(firing, kiln, member)


@router.get("", response_model=list[FiringRead])
def list_firings(
    session: SessionDep,
    _member: CurrentMember,
    kiln_id: int | None = Query(default=None),
    month: str | None = Query(default=None, description="YYYY-MM, optional"),
    limit: int = Query(default=200, ge=1, le=500),
) -> list[FiringRead]:
    query = select(Firing)
    if kiln_id is not None:
        query = query.where(Firing.kiln_id == kiln_id)
    firings = session.execute(query.order_by(Firing.scheduled_start)).scalars().all()

    if month is not None:
        window_start, window_end = _parse_month(month)
        # A firing belongs to the month if its firing+cooldown range touches it.
        firings = [
            firing
            for firing in firings
            if firing.scheduled_start < window_end and _occupied_until(firing) >= window_start
        ]

    return [_read_one(session, firing) for firing in firings[:limit]]


@router.get("/{firing_id}", response_model=FiringRead)
def get_firing(firing_id: int, session: SessionDep, _member: CurrentMember) -> FiringRead:
    firing = session.get(Firing, firing_id)
    if firing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Firing not found.")
    return _read_one(session, firing)


@router.post("", response_model=FiringRead, status_code=status.HTTP_201_CREATED)
def create_firing(payload: FiringCreate, session: SessionDep, member: CurrentMember) -> FiringRead:
    kiln = _get_kiln(session, payload.kiln_id)
    _ensure_no_conflict(
        session, kiln, payload.scheduled_start, payload.duration_hours, payload.cooldown_hours
    )
    firing = Firing(
        kiln_id=kiln.id,
        created_by=member.id,
        title=payload.title,
        target_cone=payload.target_cone,
        scheduled_start=payload.scheduled_start,
        duration_hours=payload.duration_hours,
        cooldown_hours=payload.cooldown_hours,
        notes=payload.notes,
    )
    session.add(firing)
    session.commit()
    session.refresh(firing)
    return _read_one(session, firing)


@router.patch("/{firing_id}", response_model=FiringRead)
def update_firing(
    firing_id: int, payload: FiringUpdate, session: SessionDep, _member: CurrentMember
) -> FiringRead:
    firing = session.get(Firing, firing_id)
    if firing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Firing not found.")

    kiln = _get_kiln(session, payload.kiln_id)
    _ensure_no_conflict(
        session,
        kiln,
        payload.scheduled_start,
        payload.duration_hours,
        payload.cooldown_hours,
        exclude_id=firing.id,
    )

    firing.kiln_id = kiln.id
    firing.title = payload.title
    firing.target_cone = payload.target_cone
    firing.scheduled_start = payload.scheduled_start
    firing.duration_hours = payload.duration_hours
    firing.cooldown_hours = payload.cooldown_hours
    firing.notes = payload.notes
    session.add(firing)
    session.commit()
    session.refresh(firing)
    return _read_one(session, firing)


@router.delete("/{firing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_firing(firing_id: int, session: SessionDep, _member: CurrentMember) -> None:
    firing = session.get(Firing, firing_id)
    if firing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Firing not found.")
    session.delete(firing)
    session.commit()
