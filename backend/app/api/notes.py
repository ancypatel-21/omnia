import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.memory_item import MemorySourceType
from app.models.note import Note
from app.models.user import User
from app.schemas.note import NoteCreate, NoteRead, NoteUpdate
from app.services import memory_service

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("", response_model=list[NoteRead])
async def list_notes(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = await db.scalars(
        select(Note).where(Note.user_id == user.id).order_by(Note.is_pinned.desc(), Note.updated_at.desc())
    )
    return rows.all()


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def create_note(
    payload: NoteCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    note = Note(user_id=user.id, **payload.model_dump())
    db.add(note)
    await db.commit()
    await db.refresh(note)
    await memory_service.add_memory(
        db, user.id, MemorySourceType.note, f"{note.title}: {note.content}", source_id=note.id
    )
    return note


async def _get_owned_note(db: AsyncSession, user: User, note_id: uuid.UUID) -> Note:
    note = await db.get(Note, note_id)
    if not note or note.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


@router.get("/{note_id}", response_model=NoteRead)
async def get_note(
    note_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    return await _get_owned_note(db, user, note_id)


@router.patch("/{note_id}", response_model=NoteRead)
async def update_note(
    note_id: uuid.UUID,
    payload: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    note = await _get_owned_note(db, user, note_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(note, field, value)
    await db.commit()
    await db.refresh(note)
    await memory_service.add_memory(
        db, user.id, MemorySourceType.note, f"{note.title}: {note.content}", source_id=note.id
    )
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    note = await _get_owned_note(db, user, note_id)
    await db.delete(note)
    await db.commit()
