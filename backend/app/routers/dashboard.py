"""Single landing summary for the studio dashboard."""

from fastapi import APIRouter
from sqlmodel import select

from ..deps import CurrentMember, SessionDep
from ..models import Firing, GlazeTile, Kiln, LoadSheet, Member, studio_now
from ..schemas import DashboardSummary
from .firings import to_firing_read
from .glaze_tiles import to_tile_read
from .load_sheets import to_sheet_read

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(session: SessionDep, _member: CurrentMember) -> DashboardSummary:
    now = studio_now()
    kilns = {kiln.id: kiln for kiln in session.execute(select(Kiln)).scalars().all()}
    members = {member.id: member for member in session.execute(select(Member)).scalars().all()}

    firings = session.execute(select(Firing).order_by(Firing.scheduled_start)).scalars().all()
    upcoming = [firing for firing in firings if firing.scheduled_start >= now]
    cooling_now = sum(
        1 for firing in firings if firing.cooldown_start <= now < firing.cooldown_end
    )

    sheets = (
        session.execute(select(LoadSheet).order_by(LoadSheet.created_at.desc(), LoadSheet.id.desc()))
        .scalars()
        .all()
    )
    status_counts = {"draft": 0, "loaded": 0, "fired": 0}
    for sheet in sheets:
        status_counts[sheet.status] = status_counts.get(sheet.status, 0) + 1

    tiles = (
        session.execute(select(GlazeTile).order_by(GlazeTile.tested_on.desc(), GlazeTile.id.desc()).limit(6))
        .scalars()
        .all()
    )

    return DashboardSummary(
        upcoming_firings=[
            to_firing_read(firing, kilns[firing.kiln_id], members.get(firing.created_by))
            for firing in upcoming[:5]
        ],
        cooling_now=cooling_now,
        upcoming_count=len(upcoming),
        kiln_count=len(kilns),
        sheet_status_counts=status_counts,
        recent_load_sheets=[
            to_sheet_read(sheet, kilns[sheet.kiln_id]) for sheet in sheets[:4]
        ],
        recent_glaze_tiles=[to_tile_read(tile) for tile in tiles],
    )
