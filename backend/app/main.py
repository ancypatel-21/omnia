from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, conversations, documents, notes, search, tasks
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Omnia API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(notes.router)
app.include_router(documents.router)
app.include_router(tasks.router)
app.include_router(conversations.router)
app.include_router(search.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "llm_provider": settings.active_provider}
