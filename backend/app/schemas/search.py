import uuid

from pydantic import BaseModel

from app.models.memory_item import MemorySourceType


class SearchQuery(BaseModel):
    query: str
    limit: int = 8


class SearchResult(BaseModel):
    id: uuid.UUID
    source_type: MemorySourceType
    source_id: uuid.UUID | None
    content: str
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResult]
    took_ms: float
    cache_hit: bool = False
