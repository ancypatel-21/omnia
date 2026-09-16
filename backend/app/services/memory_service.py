import hashlib
import time
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import get_cache
from app.models.memory_item import MemoryItem, MemorySourceType
from app.schemas.search import SearchResult
from app.services.embedding_service import embed_text

SEARCH_CACHE_TTL_SECONDS = 120
SEARCH_CACHE_PREFIX = "search:"


async def add_memory(
    db: AsyncSession,
    user_id: uuid.UUID,
    source_type: MemorySourceType,
    content: str,
    source_id: uuid.UUID | None = None,
) -> MemoryItem:
    """Embed and persist a piece of content into the shared memory index.
    Called whenever a note/document/task/message is created or edited so
    the assistant can retrieve it later regardless of which feature it
    came from."""
    embedding = await embed_text(content)
    item = MemoryItem(
        user_id=user_id,
        source_type=source_type,
        source_id=source_id,
        content=content,
        embedding=embedding,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    cache = get_cache()
    await cache.invalidate_prefix(f"{SEARCH_CACHE_PREFIX}{user_id}:")
    return item


def _cache_key(user_id: uuid.UUID, query: str, limit: int) -> str:
    digest = hashlib.sha256(f"{query}|{limit}".encode()).hexdigest()
    return f"{SEARCH_CACHE_PREFIX}{user_id}:{digest}"


async def semantic_search(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    limit: int = 8,
) -> tuple[list[SearchResult], float, bool]:
    """Retrieve the most relevant memory items for a query.

    Two things keep this fast enough for interactive use (<300ms):
    a Redis cache in front of repeated/similar queries, and a pgvector
    ANN index (see the alembic migration) behind the cosine-distance
    ORDER BY so Postgres doesn't do a full sequential scan.
    """
    start = time.perf_counter()
    cache = get_cache()
    key = _cache_key(user_id, query, limit)

    cached = await cache.get_json(key)
    if cached is not None:
        results = [SearchResult(**r) for r in cached]
        return results, (time.perf_counter() - start) * 1000, True

    query_embedding = await embed_text(query)
    distance = MemoryItem.embedding.cosine_distance(query_embedding)
    stmt = (
        select(MemoryItem, distance.label("distance"))
        .where(MemoryItem.user_id == user_id)
        .order_by(distance)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()

    results = [
        SearchResult(
            id=item.id,
            source_type=item.source_type,
            source_id=item.source_id,
            content=item.content,
            score=max(0.0, 1.0 - float(dist)),
        )
        for item, dist in rows
    ]

    await cache.set_json(key, [r.model_dump(mode="json") for r in results], ttl_seconds=SEARCH_CACHE_TTL_SECONDS)
    return results, (time.perf_counter() - start) * 1000, False
