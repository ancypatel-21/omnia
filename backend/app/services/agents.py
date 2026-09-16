import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation, Message, MessageRole
from app.models.memory_item import MemorySourceType
from app.models.note import Note
from app.models.task import Task
from app.services import llm_service, memory_service

HISTORY_WINDOW = 12
ASSISTANT_SYSTEM_PROMPT = (
    "You are Omnia, a personal productivity assistant. You have access to the "
    "user's notes, documents, and tasks through the memory context provided. "
    "Be concise and practical. When the user asks you to remember or track "
    "something, use the create_task or create_note tools."
)


class Agent(ABC):
    """Base class for the small set of agents Omnia runs. Keeping a shared
    interface makes it easy to add new agents (e.g. a planner or a digest
    agent) that plug into the same memory + LLM services."""

    name: str

    @abstractmethod
    async def run(self, db: AsyncSession, **kwargs): ...


@dataclass
class AssistantTurnResult:
    message: Message
    used_memory: list[str]
    mock_mode: bool


class AssistantAgent(Agent):
    """Conversational agent: retrieves relevant memory, talks to the LLM
    (or its mock stand-in), executes any tool calls it requests (creating
    tasks/notes), and persists the turn."""

    name = "assistant"

    async def run(
        self,
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        conversation: Conversation,
        user_text: str,
    ) -> AssistantTurnResult:
        user_message = Message(conversation_id=conversation.id, role=MessageRole.user, content=user_text)
        db.add(user_message)
        await db.commit()
        await db.refresh(user_message)
        await memory_service.add_memory(
            db, user_id, MemorySourceType.message, user_text, source_id=user_message.id
        )

        results, _, _ = await memory_service.semantic_search(db, user_id, user_text, limit=6)
        memory_context = [r.content for r in results]

        history_rows = (
            (
                await db.execute(
                    select(Message)
                    .where(Message.conversation_id == conversation.id)
                    .order_by(Message.created_at.desc())
                    .limit(HISTORY_WINDOW)
                )
            )
            .scalars()
            .all()
        )
        history = [{"role": m.role.value, "content": m.content} for m in reversed(history_rows)]

        llm_result = await llm_service.chat_completion(ASSISTANT_SYSTEM_PROMPT, history, memory_context)

        for call in llm_result.tool_calls:
            await self._execute_tool(db, user_id, call.name, call.arguments)

        assistant_message = Message(
            conversation_id=conversation.id, role=MessageRole.assistant, content=llm_result.text
        )
        db.add(assistant_message)
        await db.commit()
        await db.refresh(assistant_message)
        await memory_service.add_memory(
            db, user_id, MemorySourceType.message, llm_result.text, source_id=assistant_message.id
        )

        return AssistantTurnResult(
            message=assistant_message, used_memory=memory_context, mock_mode=llm_result.mock_mode
        )

    async def _execute_tool(self, db: AsyncSession, user_id: uuid.UUID, name: str, args: dict) -> None:
        if name == "create_task":
            task = Task(user_id=user_id, title=args.get("title", "Untitled task"), description=args.get("description", ""))
            db.add(task)
            await db.commit()
            await db.refresh(task)
            await memory_service.add_memory(
                db, user_id, MemorySourceType.task, f"{task.title}: {task.description}", source_id=task.id
            )
        elif name == "create_note":
            note = Note(user_id=user_id, title=args.get("title", "Untitled note"), content=args.get("content", ""))
            db.add(note)
            await db.commit()
            await db.refresh(note)
            await memory_service.add_memory(
                db, user_id, MemorySourceType.note, f"{note.title}: {note.content}", source_id=note.id
            )


class SummarizerAgent(Agent):
    """Condenses a longer note/document into a short highlight that gets
    stored as its own memory item, so future retrieval can surface the
    gist without re-embedding (and re-ranking against) the full text."""

    name = "summarizer"

    async def run(self, db: AsyncSession, *, text: str) -> str:
        if not text.strip():
            return ""
        llm_result = await llm_service.chat_completion(
            "Summarize the following content in one short sentence for a memory index.",
            [{"role": "user", "content": text}],
            memory_context=[],
        )
        if llm_result.mock_mode:
            return text.strip().splitlines()[0][:140]
        return llm_result.text


assistant_agent = AssistantAgent()
summarizer_agent = SummarizerAgent()
