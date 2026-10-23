"""Idempotent studio seed data.

Runs on every boot (see ``app.main.lifespan``) and again from ``python3 -m seed``.
Existing rows are never duplicated or overwritten, so edits made in the UI survive
a restart. Firing dates are generated relative to today so the calendar always
renders populated.
"""

from datetime import date, timedelta

from sqlmodel import Session, select

from .db import engine, init_db
from .models import Firing, GlazeTile, Kiln, LoadSheet, Member, studio_now
from .security import hash_password

DEMO_MEMBERS = [
    {
        "email": "cenius@cenius.ai",
        "password": "cenius",
        "display_name": "Cenius Demo",
        "studio_role": "Studio lead",
        "bio": "Studio lead. Runs the Tuesday glaze testing sessions and keeps the firing log honest.",
        "created_at_days_ago": 420,
    },
    {
        "email": "demo@kiln.studio",
        "password": "demo1234",
        "display_name": "Marta Okonjo",
        "studio_role": "Studio technician",
        "bio": "Technician on the Bailey 28. Ask me about element changes before a cone 10 week.",
        "created_at_days_ago": 260,
    },
]


def _seed_members(session: Session) -> dict[str, Member]:
    members: dict[str, Member] = {}
    for spec in DEMO_MEMBERS:
        member = session.execute(select(Member).where(Member.email == spec["email"])).scalars().first()
        if member is None:
            member = Member(
                email=spec["email"],
                password_hash=hash_password(spec["password"]),
                display_name=spec["display_name"],
                studio_role=spec["studio_role"],
                bio=spec["bio"],
                created_at=studio_now() - timedelta(days=spec["created_at_days_ago"]),
            )
            session.add(member)
            session.commit()
            session.refresh(member)
        members[spec["email"]] = member
    return members


def _seed_kilns(session: Session) -> dict[str, Kiln]:
    specs = [
        {
            "name": "Studio A — Bailey 28",
            "kiln_type": "electric",
            "max_cone": "Cone 10",
            "notes": "32 cu ft electric. Studio workhorse; element swap logged last winter.",
        },
        {
            "name": "Studio B — Geil Downdraft",
            "kiln_type": "gas",
            "max_cone": "Cone 10",
            "notes": "Reduction kiln by the loading dock. Needs a two-hour soak at temperature.",
        },
    ]
    kilns: dict[str, Kiln] = {}
    for spec in specs:
        kiln = session.execute(select(Kiln).where(Kiln.name == spec["name"])).scalars().first()
        if kiln is None:
            kiln = Kiln(**spec)
            session.add(kiln)
            session.commit()
            session.refresh(kiln)
        kilns[spec["name"]] = kiln
    return kilns


def _seed_firings(session: Session, kilns: dict[str, Kiln], members: dict[str, Member]) -> None:
    base = studio_now().replace(minute=0, second=0, microsecond=0)
    electric = kilns["Studio A — Bailey 28"]
    gas = kilns["Studio B — Geil Downdraft"]
    created_by = members["cenius@cenius.ai"].id

    specs = [
        {
            "kiln": electric,
            "title": "Bisque — members' mugs and test bowls",
            "target_cone": "Cone 06",
            "scheduled_start": base - timedelta(hours=14),
            "duration_hours": 6.0,
            "cooldown_hours": 30.0,
            "notes": "Two shelves of member mugs; leave the top spy hole plugged.",
        },
        {
            "kiln": gas,
            "title": "Reduction — celadon bowls",
            "target_cone": "Cone 10",
            "scheduled_start": base + timedelta(hours=30),
            "duration_hours": 10.0,
            "cooldown_hours": 18.0,
            "notes": "Body reduction at 950 °C for 45 minutes, then neutral to cone.",
        },
        {
            "kiln": electric,
            "title": "Glaze — dinnerware series",
            "target_cone": "Cone 6",
            "scheduled_start": base + timedelta(hours=96),
            "duration_hours": 8.0,
            "cooldown_hours": 20.0,
            "notes": "Slow cool from 1100 °C to get the satin break on the rims.",
        },
        {
            "kiln": gas,
            "title": "Soda test — tile rack",
            "target_cone": "Cone 8",
            "scheduled_start": base + timedelta(hours=168),
            "duration_hours": 9.0,
            "cooldown_hours": 16.0,
            "notes": "Sixteen test tiles on the top rack; weigh the soda charge before lighting.",
        },
    ]

    for spec in specs:
        existing = (
            session.execute(
                select(Firing).where(
                    Firing.kiln_id == spec["kiln"].id,
                    Firing.title == spec["title"],
                )
            )
            .scalars()
            .first()
        )
        if existing is not None:
            continue
        session.add(
            Firing(
                kiln_id=spec["kiln"].id,
                created_by=created_by,
                title=spec["title"],
                target_cone=spec["target_cone"],
                scheduled_start=spec["scheduled_start"],
                duration_hours=spec["duration_hours"],
                cooldown_hours=spec["cooldown_hours"],
                notes=spec["notes"],
            )
        )
    session.commit()


def _seed_load_sheets(session: Session, kilns: dict[str, Kiln]) -> None:
    now = studio_now()
    specs = [
        {
            "kiln": kilns["Studio A — Bailey 28"],
            "title": "Members' mug bisque",
            "cone": "Cone 06",
            "cone_temp_c": 1000,
            "ware_count": 24,
            "status": "loaded",
            "notes": "Two shelves of member mugs and six test bowls. Middle shelf runs hot.",
            "created_at": now - timedelta(days=2, hours=3),
        },
        {
            "kiln": kilns["Studio B — Geil Downdraft"],
            "title": "Celadon reduction load",
            "cone": "Cone 10",
            "cone_temp_c": 1300,
            "ware_count": 12,
            "status": "draft",
            "notes": "Bowls from the Thursday throwing class; leave one shelf free for the tile rack.",
            "created_at": now - timedelta(days=5, hours=1),
        },
        {
            "kiln": kilns["Studio A — Bailey 28"],
            "title": "Dinnerware glaze firing",
            "cone": "Cone 6",
            "cone_temp_c": 1220,
            "ware_count": 18,
            "status": "fired",
            "notes": "Full set for the market order. Wadding on all feet, lids cracked.",
            "created_at": now - timedelta(days=12, hours=6),
        },
    ]
    for spec in specs:
        existing = session.execute(select(LoadSheet).where(LoadSheet.title == spec["title"])).scalars().first()
        if existing is not None:
            continue
        session.add(
            LoadSheet(
                kiln_id=spec["kiln"].id,
                title=spec["title"],
                cone=spec["cone"],
                cone_temp_c=spec["cone_temp_c"],
                ware_count=spec["ware_count"],
                status=spec["status"],
                notes=spec["notes"],
                created_at=spec["created_at"],
                updated_at=spec["created_at"],
            )
        )
    session.commit()


def _seed_glaze_tiles(session: Session) -> None:
    today = date.today()
    specs = [
        {
            "name": "Shino Standard",
            "cone": "Cone 10",
            "surface": "satin",
            "color_hex": "#b4674e",
            "rating": 5,
            "result_notes": "Warm orange-peel surface, breaks cream over rims and handles.",
            "tested_on": today - timedelta(days=3),
        },
        {
            "name": "Celadon Ice",
            "cone": "Cone 10",
            "surface": "glossy",
            "color_hex": "#8fb8a8",
            "rating": 4,
            "result_notes": "Clean blue-green; faint crazing on the third tile, none on the first two.",
            "tested_on": today - timedelta(days=6),
        },
        {
            "name": "Tenmoku Deep",
            "cone": "Cone 10",
            "surface": "glossy",
            "color_hex": "#241f1c",
            "rating": 5,
            "result_notes": "Mirror black at this thickness, no iron speckle until it breaks thin.",
            "tested_on": today - timedelta(days=9),
        },
        {
            "name": "Matte Oat",
            "cone": "Cone 6",
            "surface": "matte",
            "color_hex": "#d9cdb4",
            "rating": 3,
            "result_notes": "Even and dry but slightly chalky where it is thin. Go two dips next time.",
            "tested_on": today - timedelta(days=14),
        },
        {
            "name": "Copper Red No. 2",
            "cone": "Cone 10",
            "surface": "satin",
            "color_hex": "#7e2f2a",
            "rating": 4,
            "result_notes": "Red came through on the top shelf only; bottom shelf flashed grey.",
            "tested_on": today - timedelta(days=18),
        },
        {
            "name": "Lichen Satin",
            "cone": "Cone 6",
            "surface": "matte",
            "color_hex": "#7d8a5c",
            "rating": 3,
            "result_notes": "Green breaks pale over texture. Reliable for handles, flat on broad surfaces.",
            "tested_on": today - timedelta(days=24),
        },
    ]
    for spec in specs:
        existing = (
            session.execute(
                select(GlazeTile).where(
                    GlazeTile.name == spec["name"], GlazeTile.tested_on == spec["tested_on"]
                )
            )
            .scalars()
            .first()
        )
        if existing is None:
            existing = session.execute(select(GlazeTile).where(GlazeTile.name == spec["name"])).scalars().first()
        if existing is not None:
            continue
        session.add(GlazeTile(**spec))
    session.commit()


def seed_database(session: Session) -> None:
    """Create the demo member, two kilns, four firings, three sheets and six tiles."""
    members = _seed_members(session)
    kilns = _seed_kilns(session)
    _seed_firings(session, kilns, members)
    _seed_load_sheets(session, kilns)
    _seed_glaze_tiles(session)


def seed_fresh() -> dict[str, int]:
    """Create the schema (if missing) and seed; returns current row counts."""
    init_db()
    with Session(engine) as session:
        seed_database(session)
        return {
            "members": len(session.execute(select(Member)).scalars().all()),
            "kilns": len(session.execute(select(Kiln)).scalars().all()),
            "firings": len(session.execute(select(Firing)).scalars().all()),
            "load_sheets": len(session.execute(select(LoadSheet)).scalars().all()),
            "glaze_tiles": len(session.execute(select(GlazeTile)).scalars().all()),
        }
