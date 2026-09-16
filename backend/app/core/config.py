from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"

    database_url: str = "postgresql+asyncpg://omnia:omnia@localhost:5432/omnia"
    sync_database_url: str = "postgresql+psycopg2://omnia:omnia@localhost:5432/omnia"

    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # "openai" (default; needs OPENAI_API_KEY, falls back to mock without
    # one), "ollama" (free, local alternative — see README), or "mock"
    # (deterministic local stand-ins, no model calls at all).
    llm_provider: Literal["ollama", "openai", "mock"] = "openai"

    openai_api_key: str | None = None
    openai_chat_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"

    ollama_base_url: str = "http://localhost:11434"
    ollama_chat_model: str = "qwen2.5:7b"
    ollama_embedding_model: str = "nomic-embed-text"

    # Must match the active embedding model's output size (OpenAI's
    # text-embedding-3-small is 1536-dim, nomic-embed-text is 768-dim) —
    # the pgvector column is created with this fixed dimension via migration.
    embedding_dim: int = 1536

    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def active_provider(self) -> Literal["ollama", "openai", "mock"]:
        """The provider actually in effect, falling back to mock if
        "openai" was selected but no key is configured."""
        if self.llm_provider == "openai" and not self.openai_api_key:
            return "mock"
        return self.llm_provider

    @property
    def openai_enabled(self) -> bool:
        return self.active_provider == "openai"


@lru_cache
def get_settings() -> Settings:
    return Settings()
