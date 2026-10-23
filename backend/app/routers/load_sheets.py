"""Kiln load sheets: cone temperature and ware count, full CRUD."""

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from ..deps import CurrentMember, SessionDep
from ..models import Kiln, LoadSheet, studio_now
from ..schemas import LoadSheetCreate, LoadSheetRead, LoadSheetUpdate

router = APIRouter(prefix="/api/load-sheets", tags=["load-sheets"])


def _get_kiln(session: SessionDep, kiln_id: int) -> Kiln:
    kiln = session.get(Kiln, kiln_id)
    if kiln is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=[{"loc": ["body", "kiln_id"], "msg": "Choose one of the studio kilns.", "type": "value_error"}],
        )
    return kiln


def to_sheet_read(sheet: LoadSheet, kiln: Kiln) -> LoadSheetRead:
    return LoadSheetRead(
        id=sheet.id,
        kiln_id=sheet.kiln_id,
        kiln_name=kiln.name,
        title=sheet.title,
        cone=sheet.cone,
        cone_temp_c=sheet.cone_temp_c,
        ware_count=sheet.ware_count,
        status=sheet.status,
        notes=sheet.notes,
        created_at=sheet.created_at,
        updated_at=sheet.updated_at,
    )


def _read_one(session: SessionDep, sheet: LoadSheet) -> LoadSheetRead:
    return to_sheet_read(sheet, session.get(Kiln, sheet.kiln_id))


@router.get("", response_model=list[LoadSheetRead])
def list_load_sheets(
    session: SessionDep,
    _member: CurrentMember,
    kiln_id: int | None = Query(default=None),
    sheet_status: str | None = Query(default=None, alias="status"),
) -> list[LoadSheetRead]:
    query = select(LoadSheet)
    if kiln_id is not None:
        query = query.where(LoadSheet.kiln_id == kiln_id)
    if sheet_status is not None:
        query = query.where(LoadSheet.status == sheet_status)
    sheets = session.execute(query.order_by(LoadSheet.created_at.desc(), LoadSheet.id.desc())).scalars().all()
    return [_read_one(session, sheet) for sheet in sheets]


@router.get("/{sheet_id}", response_model=LoadSheetRead)
def get_load_sheet(sheet_id: int, session: SessionDep, _member: CurrentMember) -> LoadSheetRead:
    sheet = session.get(LoadSheet, sheet_id)
    if sheet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Load sheet not found.")
    return _read_one(session, sheet)


@router.post("", response_model=LoadSheetRead, status_code=status.HTTP_201_CREATED)
def create_load_sheet(
    payload: LoadSheetCreate, session: SessionDep, _member: CurrentMember
) -> LoadSheetRead:
    kiln = _get_kiln(session, payload.kiln_id)
    sheet = LoadSheet(**payload.model_dump())
    session.add(sheet)
    session.commit()
    session.refresh(sheet)
    return to_sheet_read(sheet, kiln)


@router.patch("/{sheet_id}", response_model=LoadSheetRead)
def update_load_sheet(
    sheet_id: int, payload: LoadSheetUpdate, session: SessionDep, _member: CurrentMember
) -> LoadSheetRead:
    sheet = session.get(LoadSheet, sheet_id)
    if sheet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Load sheet not found.")
    kiln = _get_kiln(session, payload.kiln_id)

    for field, value in payload.model_dump().items():
        setattr(sheet, field, value)
    sheet.updated_at = studio_now()
    session.add(sheet)
    session.commit()
    session.refresh(sheet)
    return to_sheet_read(sheet, kiln)


@router.delete("/{sheet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_load_sheet(sheet_id: int, session: SessionDep, _member: CurrentMember) -> None:
    sheet = session.get(LoadSheet, sheet_id)
    if sheet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Load sheet not found.")
    session.delete(sheet)
    session.commit()
