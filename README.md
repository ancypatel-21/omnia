<div align="center">

# Omnia

**A personal AI productivity workspace — notes, documents, and tasks, tied together by an assistant with real persistent memory.**

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-async-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Redis](https://img.shields.io/badge/Redis-cache-DC382D?logo=redis&logoColor=white)](https://redis.io/)

</div>

<br>

<div align="center">
  <img src=".github/screenshots/dashboard.png" alt="Omnia dashboard" width="850">
</div>

## What is this

Omnia is a single-user productivity workspace that behaves like Notion, a
todo app, and an AI assistant had a baby — except the assistant actually
*remembers* everything you've written across all three. Every note,
document, task, and chat message is embedded into a shared vector index, so
asking the assistant "what's the plan for Lisbon?" pulls in your itinerary
document, your trip notes, and any related tasks automatically, without you
having to paste anything back in.

It runs entirely on your own machine, works fully offline in mock mode with
zero setup, and costs nothing unless you choose to turn on a paid API.

## Features

- **Notes & documents** — fast create/edit/pin, instant filtering, everything auto-indexed for retrieval as you type
- **Tasks** — a real drag-and-drop Kanban board (To do / In progress / Done), priorities, due dates
- **AI assistant** — a chat interface that retrieves relevant memory before responding, and can act: say `todo: renew my passport` and it actually creates the task, not just a suggestion
- **Semantic search** — one search box across notes, documents, tasks, and past conversations, ranked by real vector similarity
- **Command palette** (`⌘K` / `Ctrl+K`) — jump anywhere or quick-create a note/task/document without touching the mouse
- **Runs with zero setup** — ships with a mock AI mode that exercises every feature (chat, tool-calling, retrieval) with zero API calls until you add a key
- **Sub-300ms retrieval** — pgvector ANN indexing + a Redis cache in front of repeated queries

## Screenshots

<table>
<tr>
<td width="50%">

**Notes**
<img src=".github/screenshots/notes.png" alt="Notes">

</td>
<td width="50%">

**Tasks — drag-and-drop Kanban**
<img src=".github/screenshots/tasks.png" alt="Tasks">

</td>
</tr>
<tr>
<td width="50%">

**AI assistant with memory**
<img src=".github/screenshots/chat.png" alt="Assistant">

</td>
<td width="50%">

**Semantic search**
<img src=".github/screenshots/search.png" alt="Semantic search">

</td>
</tr>
<tr>
<td width="50%">

**Command palette (⌘K)**
<img src=".github/screenshots/command-palette.png" alt="Command palette">

</td>
<td width="50%">

**Sign in**
<img src=".github/screenshots/login.png" alt="Login">

</td>
</tr>
</table>

## How it works

```mermaid
flowchart LR
    subgraph Client["Browser"]
        FE["React + TypeScript\nVite · Tailwind · React Query"]
    end

    subgraph Server["FastAPI backend"]
        API["REST API\nauth · notes · documents · tasks · chat · search"]
        Agent["AssistantAgent / SummarizerAgent\ntool-calling: create_task, create_note"]
        Mem["memory_service\nembed on every write, cosine-similarity retrieval"]
    end

    subgraph Data["Data layer"]
        PG[("PostgreSQL\n+ pgvector · ivfflat index")]
        Redis[("Redis\nsearch-result cache")]
    end

    subgraph AI["AI provider (pluggable)"]
        OpenAI["OpenAI\ngpt-4o-mini + text-embedding-3"]
        Mock["Mock\nzero calls, deterministic"]
    end

    FE <-->|HTTPS/JSON| API
    API --> Agent
    API --> Mem
    Agent --> Mem
    Mem <--> PG
    Mem <--> Redis
    Agent -.->|chat + embeddings| AI
    Mem -.->|embeddings| AI
```

**Persistent memory & semantic search.** Every note, document, task, and
chat message is embedded and stored in a `memory_items` table (a pgvector
column). The `/api/search` endpoint and the assistant's context retrieval
both query it with a cosine-distance `ORDER BY`, backed by an ivfflat ANN
index, and cache results in Redis for ~120s — keeping repeated or related
queries comfortably under a 300ms budget.

**AI agents.** `AssistantAgent` handles chat turns: it retrieves relevant
memory, calls the LLM with `create_task` / `create_note` tool definitions,
executes any tool calls the model makes, and persists the whole turn back
into memory. `SummarizerAgent` condenses documents into a short highlight
stored alongside the full text, improving retrieval quality without
blowing up token or embedding cost.

**Two interchangeable AI modes**, switched with one line in `.env` and no
code changes:

| Provider | Cost | Setup | Chat model | Embedding model |
|---|---|---|---|---|
| `openai` *(default)* | Paid | Add `OPENAI_API_KEY` | `gpt-4o-mini` | `text-embedding-3-small` |
| `mock` | Free | None | deterministic stand-in | deterministic stand-in |

With no `OPENAI_API_KEY` set, the app automatically runs in mock mode —
every feature (chat, tool-calling, retrieval) works end-to-end with zero
external calls, so you can try the whole thing before deciding to add a
real key.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4, React Query, Zustand, Framer Motion, dnd-kit, cmdk |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2 |
| Database | PostgreSQL 16 + [pgvector](https://github.com/pgvector/pgvector) |
| Cache | Redis 7 |
| Auth | JWT (python-jose) + bcrypt |
| AI | OpenAI SDK (chat + embeddings), with a deterministic mock mode |
| Infra | Docker Compose (Postgres + Redis), one `dev.sh` launcher |

## Project structure

```
backend/
  app/
    models/      SQLAlchemy models — User, Note, Document, Task, Conversation, Message, MemoryItem
    schemas/     Pydantic request/response schemas
    api/         FastAPI routers — auth, notes, documents, tasks, conversations, search
    services/
      embedding_service.py   OpenAI embeddings, or a deterministic mock
      llm_service.py         OpenAI chat + tool-calling, or a rule-based mock
      memory_service.py      Embed + store + pgvector similarity search, Redis-cached
      agents.py              AssistantAgent (chat + tool use) and SummarizerAgent
    db/          Async session + declarative base
  alembic/       Migrations
  scripts/
    reindex_memory.py        Rebuilds memory_items for every user under the active embedding model

frontend/
  src/
    api/         Axios client + one module per resource
    pages/       Dashboard, Notes, Documents, Tasks, Chat, Search, Login, Register
    components/  Layout (sidebar, shell, command palette), shared UI primitives
    store/       Zustand stores (auth, command palette)

docker-compose.yml   Postgres (pgvector) + Redis
dev.sh               One-command launcher for local development
```

## Getting started

### Quick start (after the one-time setup below)

```bash
./dev.sh
```

Starts Postgres + Redis (Docker), the backend on `:8000`, and the frontend
on `:5173`, all in one terminal. `Ctrl+C` stops the backend/frontend; the
database containers keep running (`docker compose down` to stop those too).

### One-time setup

**1. Infrastructure (Postgres + Redis)**

```bash
docker compose up -d
```

**2. Backend**

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in JWT_SECRET; leave OPENAI_API_KEY blank for mock mode
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs` — `/api/health` reports which
`llm_provider` is currently active (`mock` until you add an API key).

**3. Frontend**

```bash
cd frontend
npm install
npm run dev
```

App at `http://localhost:5173` (proxies `/api` to the backend on `:8000`).

### Environment variables

All of these live in `backend/.env` (see `backend/.env.example`):

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://omnia:omnia@localhost:5432/omnia` | Async Postgres connection |
| `REDIS_URL` | `redis://localhost:6379/0` | Cache connection |
| `JWT_SECRET` | — | Set this to a long random string |
| `LLM_PROVIDER` | `openai` | `openai` or `mock` |
| `OPENAI_API_KEY` | *(blank)* | Leave blank to run in mock mode |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` | |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | |
| `EMBEDDING_DIM` | `1536` | Must match the active embedding model's output size |

## Adding a real OpenAI key later

Set `OPENAI_API_KEY` (and optionally `OPENAI_CHAT_MODEL` /
`OPENAI_EMBEDDING_MODEL`) in `backend/.env` and restart the backend.
`embedding_service` and `llm_service` switch from mock to real OpenAI calls
automatically — no other code changes needed. Existing mock-mode
embeddings in `memory_items` were generated with a non-semantic scheme, so
for good search quality afterward, run:

```bash
cd backend && source .venv/bin/activate && python -m scripts.reindex_memory
```

## Roadmap

- [ ] File uploads for documents (PDF/text extraction into the memory index)
- [ ] Recurring tasks and due-date reminders
- [ ] Multi-turn tool use (chaining more than one tool call per assistant turn)
- [ ] Export/import of a workspace as a single archive

## Author

**Ancy Patel**
