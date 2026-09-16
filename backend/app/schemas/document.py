import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentCreate(BaseModel):
    title: str
    content: str = ""
    mime_type: str = "text/plain"


class DocumentUpdate(BaseModel):
    title: str | None = None
    content: str | None = None


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    content: str
    mime_type: str
    created_at: datetime
    updated_at: datetime
