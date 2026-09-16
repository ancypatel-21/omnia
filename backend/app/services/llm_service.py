from dataclasses import dataclass, field
from typing import Any

from openai import AsyncOpenAI

from app.core.config import get_settings

settings = get_settings()

_client: AsyncOpenAI | None = None
_model: str | None = None

if settings.active_provider == "ollama":
    _client = AsyncOpenAI(api_key="ollama", base_url=f"{settings.ollama_base_url}/v1")
    _model = settings.ollama_chat_model
elif settings.active_provider == "openai":
    _client = AsyncOpenAI(api_key=settings.openai_api_key)
    _model = settings.openai_chat_model

TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Create a task/todo item for the user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "priority": {"type": "string", "enum": ["low", "medium", "high"]},
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_note",
            "description": "Save a note for the user to look up later.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "content": {"type": "string"},
                },
                "required": ["title", "content"],
            },
        },
    },
]


@dataclass
class ToolCall:
    name: str
    arguments: dict[str, Any]


@dataclass
class LLMResult:
    text: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    mock_mode: bool = False


def _mock_chat(system_prompt: str, history: list[dict[str, str]], memory_context: list[str]) -> LLMResult:
    """Rule-based stand-in for the OpenAI chat model. Handles a couple of
    obvious intents (todo/note creation) so the agent + tool-call pipeline
    is fully exercisable without an API key, and otherwise reflects back
    the retrieved memory so retrieval is visibly working end-to-end."""
    last_user = next((m["content"] for m in reversed(history) if m["role"] == "user"), "")
    lowered = last_user.strip().lower()

    if lowered.startswith(("todo:", "remind me to", "add task:")):
        title = last_user.split(":", 1)[-1].strip() if ":" in last_user else last_user
        return LLMResult(
            text=f'Added "{title}" to your tasks.',
            tool_calls=[ToolCall(name="create_task", arguments={"title": title})],
            mock_mode=True,
        )

    if lowered.startswith(("note:", "remember that", "save note:")):
        content = last_user.split(":", 1)[-1].strip() if ":" in last_user else last_user
        title = content[:60]
        return LLMResult(
            text=f'Saved that as a note: "{title}".',
            tool_calls=[ToolCall(name="create_note", arguments={"title": title, "content": content})],
            mock_mode=True,
        )

    if memory_context:
        joined = "; ".join(memory_context[:3])
        text = (
            f"(mock assistant — no OPENAI_API_KEY set) Based on what I have stored, "
            f"here's relevant context: {joined}. You said: \"{last_user}\"."
        )
    else:
        text = (
            f'(mock assistant — no OPENAI_API_KEY set) I heard: "{last_user}". '
            "Set OPENAI_API_KEY to get real responses."
        )
    return LLMResult(text=text, mock_mode=True)


async def chat_completion(
    system_prompt: str,
    history: list[dict[str, str]],
    memory_context: list[str],
) -> LLMResult:
    if _client is None:
        return _mock_chat(system_prompt, history, memory_context)

    context_block = "\n".join(f"- {m}" for m in memory_context) or "(no relevant memory found)"
    full_system = f"{system_prompt}\n\nRelevant memory:\n{context_block}"

    response = await _client.chat.completions.create(
        model=_model,
        messages=[{"role": "system", "content": full_system}, *history],
        tools=TOOLS,
    )
    choice = response.choices[0].message
    tool_calls = [
        ToolCall(name=tc.function.name, arguments=_safe_json(tc.function.arguments))
        for tc in (choice.tool_calls or [])
    ]
    return LLMResult(text=choice.content or "", tool_calls=tool_calls, mock_mode=False)


def _safe_json(raw: str) -> dict[str, Any]:
    import json

    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {}
