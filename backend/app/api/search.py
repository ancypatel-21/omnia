from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.search import SearchQuery, SearchResponse
from app.services.memory_service import semantic_search

router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def search(
    payload: SearchQuery, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    results, took_ms, cache_hit = await semantic_search(db, user.id, payload.query, payload.limit)
    return SearchResponse(results=results, took_ms=took_ms, cache_hit=cache_hit)
