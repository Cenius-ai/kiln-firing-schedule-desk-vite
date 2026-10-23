"""Database tables for the Kiln Firing Schedule Desk."""

from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, SQLModel


def studio_now() -> datetime:
    """Naive studio-local timestamp (no timezone conversion anywhere in the app)."""
    return datetime.now().replace(microsecond=0)


class Member(SQLModel, table=True):
    __tablename__ = "members"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True, max_length=200)
    password_hash: str = Field(max_length=200)
    display_name: str = Field(max_length=60)
    studio_role: str = Field(default="Studio member", max_length=40)
    bio: str = Field(default="", max_length=280)
    created_at: datetime = Field(default_factory=studio_now)


class Kiln(SQLModel, table=True):
    __tablename__ = "kilns"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, max_length=80)
    kiln_type: str = Field(default="electric", max_length=20)
    max_cone: str = Field(default="Cone 10", max_length=20)
    notes: str = Field(default="", max_length=280)
    created_at: datetime = Field(default_factory=studio_now)


class Firing(SQLModel, table=True):
    __tablename__ = "firings"

    id: Optional[int] = Field(default=None, primary_key=True)
    kiln_id: int = Field(foreign_key="kilns.id", index=True)
    created_by: int = Field(foreign_key="members.id", index=True)
    title: str = Field(max_length=80)
    target_cone: str = Field(max_length=20)
    scheduled_start: datetime = Field(index=True)
    duration_hours: float = Field(default=8.0)
    cooldown_hours: float = Field(default=12.0)
    notes: str = Field(default="", max_length=500)
    created_at: datetime = Field(default_factory=studio_now)

    @property
    def cooldown_start(self) -> datetime:
        return self.scheduled_start + _hours(self.duration_hours)

    @property
    def cooldown_end(self) -> datetime:
        return self.cooldown_start + _hours(self.cooldown_hours)


class LoadSheet(SQLModel, table=True):
    __tablename__ = "load_sheets"

    id: Optional[int] = Field(default=None, primary_key=True)
    kiln_id: int = Field(foreign_key="kilns.id", index=True)
    title: str = Field(max_length=80)
    cone: str = Field(max_length=20)
    cone_temp_c: int = Field(default=1220)
    ware_count: int = Field(default=12)
    status: str = Field(default="draft", max_length=10)
    notes: str = Field(default="", max_length=500)
    created_at: datetime = Field(default_factory=studio_now)
    updated_at: datetime = Field(default_factory=studio_now)


class GlazeTile(SQLModel, table=True):
    __tablename__ = "glaze_tiles"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=60)
    cone: str = Field(max_length=20)
    surface: str = Field(default="glossy", max_length=10)
    color_hex: str = Field(default="#3d2dd6", max_length=7)
    rating: int = Field(default=3)
    result_notes: str = Field(default="", max_length=280)
    tested_on: date = Field(default_factory=date.today)
    created_at: datetime = Field(default_factory=studio_now)


def _hours(value: float):
    from datetime import timedelta

    return timedelta(hours=value)
