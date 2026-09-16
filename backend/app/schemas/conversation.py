import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.conversation import MessageRole


class ConversationCreate(BaseModel):
    title: str = "New conversation"


class ConversationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime


class MessageCreate(BaseModel):
    content: str


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: MessageRole
    content: str
    created_at: datetime


class ChatResponse(BaseModel):
    message: MessageRead
    used_memory: list[str] = []
    mock_mode: bool = False
