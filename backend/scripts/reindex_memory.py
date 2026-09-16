"""Rebuild the memory_items index from scratch.

Run this after switching embedding providers/models (e.g. the OpenAI ->
Ollama migration, which truncates memory_items because vector dimensions
aren't compatible across models). Re-embeds every note, document, task,
and chat message for every user using the currently configured provider.

Usage (from backend/, with the venv active):
    python -m scripts.reindex_memory
"""
import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.models.memory_item import MemorySourceType
from app.models.note import Note
from app.models.task import Task
from app.models.user import User
from app.services import memory_service


async def reindex_user(db, user: User) -> int:
    count = 0

    notes = (await db.scalars(select(Note).where(Note.user_id == user.id))).all()
    for note in notes:
        await memory_service.add_memory(
            db, user.id, MemorySourceType.note, f"{note.title}: {note.content}", source_id=note.id
        )
        count += 1

    documents = (await db.scalars(select(Document).where(Document.user_id == user.id))).all()
    for document in documents:
        await memory_service.add_memory(
            db,
            user.id,
            MemorySourceType.document,
            f"{document.title}: {document.content}",
            source_id=document.id,
        )
        count += 1

    tasks = (await db.scalars(select(Task).where(Task.user_id == user.id))).all()
    for task in tasks:
        await memory_service.add_memory(
            db, user.id, MemorySourceType.task, f"{task.title}: {task.description}", source_id=task.id
        )
        count += 1

    messages = (
        await db.scalars(
            select(Message)
            .join(Conversation, Conversation.id == Message.conversation_id)
            .where(Conversation.user_id == user.id)
        )
    ).all()
    for message in messages:
        await memory_service.add_memory(
            db, user.id, MemorySourceType.message, message.content, source_id=message.id
        )
        count += 1

    return count


async def main() -> None:
    async with AsyncSessionLocal() as db:
        users = (await db.scalars(select(User))).all()
        total = 0
        for user in users:
            n = await reindex_user(db, user)
            total += n
            print(f"  {user.email}: {n} items re-embedded")
        print(f"Done. {total} memory items rebuilt across {len(users)} user(s).")


if __name__ == "__main__":
    asyncio.run(main())
