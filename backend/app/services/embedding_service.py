import hashlib
import struct

from openai import AsyncOpenAI

from app.core.config import get_settings

settings = get_settings()

_client: AsyncOpenAI | None = None
_model: str | None = None

if settings.active_provider == "ollama":
    _client = AsyncOpenAI(api_key="ollama", base_url=f"{settings.ollama_base_url}/v1")
    _model = settings.ollama_embedding_model
elif settings.active_provider == "openai":
    _client = AsyncOpenAI(api_key=settings.openai_api_key)
    _model = settings.openai_embedding_model


def _mock_embedding(text: str, dim: int = settings.embedding_dim) -> list[float]:
    """Deterministic, dependency-free stand-in for a real embedding model.

    Expands a SHA-256 hash of the text into `dim` pseudorandom uint16s
    (via counter-mode re-hashing) and maps each into [-1, 1], so exact
    repeats land on the same vector. This lets every retrieval/agent
    code path run and be exercised end-to-end with LLM_PROVIDER=mock.
    Deliberately avoids reinterpreting hash bytes as IEEE-754 floats
    directly, since arbitrary bit patterns there can produce NaN/Inf,
    which pgvector rejects.
    """
    seed = text.encode("utf-8")
    needed_bytes = dim * 2
    chunks = []
    counter = 0
    produced = 0
    while produced < needed_bytes:
        chunk = hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
        chunks.append(chunk)
        produced += len(chunk)
        counter += 1
    stream = b"".join(chunks)[:needed_bytes]
    values = struct.unpack(f"{dim}H", stream)
    return [(v / 32767.5) - 1.0 for v in values]


async def embed_text(text: str) -> list[float]:
    if _client is None:
        return _mock_embedding(text)

    response = await _client.embeddings.create(model=_model, input=text[:8000])
    return response.data[0].embedding


async def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    if _client is None:
        return [_mock_embedding(t) for t in texts]

    response = await _client.embeddings.create(model=_model, input=[t[:8000] for t in texts])
    return [d.embedding for d in response.data]
