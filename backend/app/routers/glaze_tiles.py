"""Glaze test tile results with cone and surface filters."""

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from ..deps import CurrentMember, SessionDep
from ..models import GlazeTile
from ..schemas import GlazeTileCreate, GlazeTileRead, GlazeTileUpdate

router = APIRouter(prefix="/api/glaze-tiles", tags=["glaze-tiles"])


def to_tile_read(tile: GlazeTile) -> GlazeTileRead:
    return GlazeTileRead(
        id=tile.id,
        name=tile.name,
        cone=tile.cone,
        surface=tile.surface,
        color_hex=tile.color_hex,
        rating=tile.rating,
        result_notes=tile.result_notes,
        tested_on=tile.tested_on,
        created_at=tile.created_at,
    )


@router.get("", response_model=list[GlazeTileRead])
def list_glaze_tiles(
    session: SessionDep,
    _member: CurrentMember,
    cone: str | None = Query(default=None),
    surface: str | None = Query(default=None),
) -> list[GlazeTileRead]:
    query = select(GlazeTile)
    if cone:
        query = query.where(GlazeTile.cone == cone)
    if surface:
        query = query.where(GlazeTile.surface == surface)
    tiles = session.execute(query.order_by(GlazeTile.tested_on.desc(), GlazeTile.id.desc())).scalars().all()
    return [to_tile_read(tile) for tile in tiles]


@router.get("/{tile_id}", response_model=GlazeTileRead)
def get_glaze_tile(tile_id: int, session: SessionDep, _member: CurrentMember) -> GlazeTileRead:
    tile = session.get(GlazeTile, tile_id)
    if tile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Glaze tile not found.")
    return to_tile_read(tile)


@router.post("", response_model=GlazeTileRead, status_code=status.HTTP_201_CREATED)
def create_glaze_tile(
    payload: GlazeTileCreate, session: SessionDep, _member: CurrentMember
) -> GlazeTileRead:
    tile = GlazeTile(**payload.model_dump())
    session.add(tile)
    session.commit()
    session.refresh(tile)
    return to_tile_read(tile)


@router.patch("/{tile_id}", response_model=GlazeTileRead)
def update_glaze_tile(
    tile_id: int, payload: GlazeTileUpdate, session: SessionDep, _member: CurrentMember
) -> GlazeTileRead:
    tile = session.get(GlazeTile, tile_id)
    if tile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Glaze tile not found.")
    for field, value in payload.model_dump().items():
        setattr(tile, field, value)
    session.add(tile)
    session.commit()
    session.refresh(tile)
    return to_tile_read(tile)


@router.delete("/{tile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_glaze_tile(tile_id: int, session: SessionDep, _member: CurrentMember) -> None:
    tile = session.get(GlazeTile, tile_id)
    if tile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Glaze tile not found.")
    session.delete(tile)
    session.commit()
