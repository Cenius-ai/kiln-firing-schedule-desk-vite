"""Pydantic request/response models — the API's validation boundary."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Surface = Literal["glossy", "satin", "matte"]
SheetStatus = Literal["draft", "loaded", "fired"]

CONE_OPTIONS = ["Cone 04", "Cone 06", "Cone 5", "Cone 6", "Cone 8", "Cone 10"]


def _as_studio_local(value: datetime) -> datetime:
    """Drop any timezone info the client sent: the studio works in local time."""
    if value.tzinfo is not None:
        value = value.astimezone().replace(tzinfo=None)
    return value.replace(microsecond=0)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=1, max_length=200)


class MemberRead(BaseModel):
    id: int
    email: str
    display_name: str
    studio_role: str
    bio: str
    created_at: datetime


class MemberUpdate(BaseModel):
    display_name: str = Field(min_length=2, max_length=60)
    studio_role: str = Field(min_length=2, max_length=40)
    bio: str = Field(default="", max_length=280)

    @field_validator("display_name", "studio_role", "bio")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()


class KilnRead(BaseModel):
    id: int
    name: str
    kiln_type: str
    max_cone: str
    notes: str


class FiringBase(BaseModel):
    kiln_id: int = Field(ge=1)
    title: str = Field(min_length=2, max_length=80)
    target_cone: str = Field(min_length=2, max_length=20)
    scheduled_start: datetime
    duration_hours: float = Field(ge=0.5, le=48)
    cooldown_hours: float = Field(ge=0, le=96)
    notes: str = Field(default="", max_length=500)

    @field_validator("title", "target_cone", "notes")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()

    @field_validator("scheduled_start")
    @classmethod
    def _normalise_start(cls, value: datetime) -> datetime:
        return _as_studio_local(value)


class FiringCreate(FiringBase):
    pass


class FiringUpdate(FiringBase):
    pass


class FiringRead(BaseModel):
    id: int
    kiln_id: int
    kiln_name: str
    created_by: int
    created_by_name: str
    title: str
    target_cone: str
    scheduled_start: datetime
    duration_hours: float
    cooldown_hours: float
    cooldown_start: datetime
    cooldown_end: datetime
    notes: str


class LoadSheetBase(BaseModel):
    kiln_id: int = Field(ge=1)
    title: str = Field(min_length=2, max_length=80)
    cone: str = Field(min_length=2, max_length=20)
    cone_temp_c: int = Field(ge=500, le=1400)
    ware_count: int = Field(ge=1, le=200)
    status: SheetStatus = "draft"
    notes: str = Field(default="", max_length=500)

    @field_validator("title", "cone", "notes")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()


class LoadSheetCreate(LoadSheetBase):
    pass


class LoadSheetUpdate(LoadSheetBase):
    pass


class LoadSheetRead(BaseModel):
    id: int
    kiln_id: int
    kiln_name: str
    title: str
    cone: str
    cone_temp_c: int
    ware_count: int
    status: str
    notes: str
    created_at: datetime
    updated_at: datetime


class GlazeTileBase(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    cone: str = Field(min_length=2, max_length=20)
    surface: Surface = "glossy"
    color_hex: str = Field(default="#3d2dd6", pattern=r"^#[0-9a-fA-F]{6}$")
    rating: int = Field(default=3, ge=1, le=5)
    result_notes: str = Field(default="", max_length=280)
    tested_on: date

    @field_validator("name", "cone", "result_notes")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()


class GlazeTileCreate(GlazeTileBase):
    pass


class GlazeTileUpdate(GlazeTileBase):
    pass


class GlazeTileRead(BaseModel):
    id: int
    name: str
    cone: str
    surface: str
    color_hex: str
    rating: int
    result_notes: str
    tested_on: date
    created_at: datetime


class DashboardSummary(BaseModel):
    upcoming_firings: list[FiringRead]
    cooling_now: int
    upcoming_count: int
    kiln_count: int
    sheet_status_counts: dict[str, int]
    recent_load_sheets: list[LoadSheetRead]
    recent_glaze_tiles: list[GlazeTileRead]


class SessionStatus(BaseModel):
    """Unauthenticated-friendly bootstrap probe (always 200 so the SPA never logs a 401)."""

    authenticated: bool
    member: MemberRead | None = None
