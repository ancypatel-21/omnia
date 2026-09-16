import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.document import Document
from app.models.memory_item import MemorySourceType
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentRead, DocumentUpdate
from app.services import memory_service
from app.services.agents import summarizer_agent

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=list[DocumentRead])
async def list_documents(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = await db.scalars(
        select(Document).where(Document.user_id == user.id).order_by(Document.updated_at.desc())
    )
    return rows.all()


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: DocumentCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    document = Document(user_id=user.id, **payload.model_dump())
    db.add(document)
    await db.commit()
    await db.refresh(document)

    summary = await summarizer_agent.run(db, text=document.content)
    memory_text = f"{document.title}: {summary}" if summary else document.title
    await memory_service.add_memory(db, user.id, MemorySourceType.document, memory_text, source_id=document.id)
    return document


async def _get_owned_document(db: AsyncSession, user: User, document_id: uuid.UUID) -> Document:
    document = await db.get(Document, document_id)
    if not document or document.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    return await _get_owned_document(db, user, document_id)


@router.patch("/{document_id}", response_model=DocumentRead)
async def update_document(
    document_id: uuid.UUID,
    payload: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document = await _get_owned_document(db, user, document_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(document, field, value)
    await db.commit()
    await db.refresh(document)

    summary = await summarizer_agent.run(db, text=document.content)
    memory_text = f"{document.title}: {summary}" if summary else document.title
    await memory_service.add_memory(db, user.id, MemorySourceType.document, memory_text, source_id=document.id)
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    document = await _get_owned_document(db, user, document_id)
    await db.delete(document)
    await db.commit()
