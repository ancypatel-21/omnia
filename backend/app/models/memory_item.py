import enum
import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import get_settings
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

settings = get_settings()


class MemorySourceType(str, enum.Enum):
    note = "note"
    document = "document"
    task = "task"
    message = "message"
    fact = "fact"


class MemoryItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """The persistent-memory store: a flattened, embedded index over
    everything the user has created or told the assistant, so agents
    can retrieve relevant context regardless of which feature it came
    from (note, document, task, or prior conversation)."""

    __tablename__ = "memory_items"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    source_type: Mapped[MemorySourceType] = mapped_column(Enum(MemorySourceType), nullable=False)
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(settings.embedding_dim))
