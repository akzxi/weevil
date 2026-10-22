# weevil — Milestone 2: Chat with Claude (FastAPI + Postgres + full chat screen)

## Context
Phase 2 turns the thought bubble into a real chat. Clicking it opens a full chat screen where you talk to the Claude character. A Python FastAPI backend calls Claude through the **Anthropic SDK** and stores conversations in **Postgres**. The backend has a small **provider layer**, so later characters can be added as data:
- Claude → Anthropic SDK (now)
- other models → **Bedrock Converse** (next phase)
- GPT → **OpenAI SDK** (next phase)

Everything runs locally for now, with keys in a gitignored `.env`.

### Decisions from the interview
| Topic | Decision |
|---|---|
| Scope | Claude chat end-to-end; the provider interface is ready for Bedrock/OpenAI adapters, which ship with their characters later |
| Chat UI | Full chat screen (character shown small, conversation sidebar) opened from the thought bubble |
| Threads | Multiple conversations per character, with a sidebar: new, rename, delete; auto-titled from the first message |
| Thinking | Streamed summarized reasoning, collapsible, shown above each reply |
| Keys / hosting | Local only: `apps/api/.env` holds `ANTHROPIC_API_KEY`; deployment and public key policy decided later |
| Storage | Postgres 17 in Docker (docker compose), SQLAlchemy 2 async + Alembic migrations |

## Prerequisites (you)
1. Install **Docker Desktop** (WSL2 backend). It isn't on this machine yet.
2. Create `apps/api/.env` from `.env.example` and paste your `ANTHROPIC_API_KEY`. I never read or print it.

## Architecture
```
docker-compose.yml          postgres:17 (volume, healthcheck), db weevil + weevil_test
apps/api/                   uv project (Python 3.14, or 3.13 if a dependency lacks wheels)
  pyproject.toml            fastapi, uvicorn[standard], anthropic (2.x), sqlalchemy[asyncio], psycopg[binary], alembic, pydantic-settings; dev: pytest, pytest-asyncio, httpx, ruff
  .env.example              ANTHROPIC_API_KEY=, DATABASE_URL=postgresql+psycopg://weevil:weevil@localhost:5432/weevil
  alembic/                  migrations (initial: conversations, messages)
  src/weevil_api/
    main.py                 app, CORS (localhost dev origins only), routers, /health
    config.py               Settings (pydantic-settings, reads .env)
    db.py                   async engine + session dependency
    models.py               Conversation(id uuid, character_id, title, created_at, updated_at)
                            Message(id, conversation_id, role, content JSONB = exact API content blocks, text, created_at)
    characters.py           server-side registry: clawd → {provider: "anthropic", model: "claude-opus-5-5", effort, system prompt}
    providers/base.py       ChatProvider protocol: stream(character, history) → async iterator of ChatEvent
                            (thinking_delta | text_delta | done{content, stop_reason, usage} | error{kind, message})
    providers/anthropic.py  Anthropic adapter
    routes/conversations.py GET/POST /api/characters/{cid}/conversations · PATCH/DELETE /api/conversations/{id} · GET …/{id}/messages
    routes/chat.py          POST /api/conversations/{id}/messages {text} → SSE stream
  tests/                    pytest: provider with a fake SDK stream, routes with a fake provider + weevil_test DB
apps/web/
  vite.config.ts            dev proxy /api → http://localhost:8000 (no CORS in dev)
  src/api/client.ts         typed fetch helpers + streamChat() (fetch + ReadableStream SSE parser; EventSource can't POST)
  src/chat/ChatScreen.tsx   sidebar | header (pixel character + name/model) | message list | composer
  src/chat/ConversationList.tsx · MessageView.tsx (markdown + collapsible thinking) · Composer.tsx
  src/state/store.ts        + view: 'world' | { chat: characterId, conversationId? }
```

### Claude call (Anthropic adapter)
- `client.beta.messages.stream(...)` with:
  - `model` = `claude-opus-5-5`, `max_tokens` 64000
  - `thinking: {type: "adaptive", display: "summarized"}`
  - `output_config.effort: "medium"`, set explicitly; it's tunable per character in `characters.py`
  - top-level `cache_control` (auto prompt caching across turns)
- **Refusal fallbacks are on by default**: `betas=["server-side-fallback-2026-07-01"]`, `fallbacks="default"`. A safety decline is retried on a fallback model in the same call. Turn it off in `characters.py` if you don't want it.
- History is **append-only and replayed verbatim**: each assistant message stores the exact `content` blocks (including thinking blocks with signatures) and sends them back unchanged. This satisfies Opus 5.5's preserved-thinking check.
- Check `stop_reason` before trusting content:
  - `refusal`: show a short explanation and save nothing broken
  - `max_tokens`: mark the reply as truncated
- Errors use the SDK's typed exception chain, mapped to SSE `error` events:
  - auth → "check ANTHROPIC_API_KEY"
  - rate limit → retry-later message
  - connection errors → retry-later message
- Before writing these calls, confirm exact SDK 2.x names against the claude-api skill's `python/` docs and the SDK changelog.

### Chat flow
1. **Opening:** clicking the thought bubble switches to `view = chat` for that character. The latest conversation opens, or a new one is created on first send.
2. **Sending:**
   - The browser POSTs `{text}`.
   - The server validates the conversation, checks the text is non-empty and ≤ 32k characters, and confirms the character exists in the server registry. The model and provider are **never** taken from the client.
   - It saves the user message, loads the history and streams provider events as SSE.
   - When the stream finishes, it saves the assistant message (blocks + text), bumps `updated_at`, and titles a new conversation from the first ~60 characters of your message.
3. **Stop button:** aborts the fetch. The server sees the disconnect, cancels the SDK stream and saves no partial assistant message. The user turn remains, so the next send is a valid follow-up.
4. **Sidebar:**
   - conversations sorted by `updated_at`
   - "New chat"
   - inline rename
   - delete with confirmation
5. **Screen details:**
   - **Character:** shown small in the header, with a new `talk` sprite mode (2 frames) while a reply streams.
   - **Back:** returns to the select view.
   - **Theme:** Minecraft panels for the sidebar and composer; readable Inter text for messages; pixel font for names.
   - **Markdown:** `react-markdown` + `remark-gfm` (new dependencies; code blocks styled, no syntax highlighting yet).
   - **Composer:** Enter sends, Shift+Enter adds a newline.

### Dev commands (root package.json)
- `npm run db:up`: `docker compose up -d`
- `npm run db:migrate`: alembic upgrade
- `npm run dev:api`: `uv run uvicorn weevil_api.main:app --reload --port 8000`
- `npm run dev`: web, as now
- `npm run test:api`: pytest

## Implementation steps (branch `m2-chat`, TDD for logic)
1. Commit this spec to `docs/superpowers/specs/2026-10-22-weevil-m2-chat-design.md`; branch.
2. Docker compose + `apps/api` scaffold with uv. Check current FastAPI SSE support, SQLAlchemy async and Alembic via Context7.
3. Models + Alembic initial migration; conversation CRUD routes (tests first, against `weevil_test`).
4. Provider protocol + Anthropic adapter (tests first with a fake stream): event mapping, refusal / max_tokens / error mapping, verbatim block replay.
5. Chat SSE route (tests with a fake provider): persistence, auto-title, validation, disconnect = no assistant save.
6. Web: Vite proxy, `api/client.ts` + SSE parser (Vitest), store `view`, ChatScreen + sidebar + message view + composer, `talk` frames, thought-bubble wiring (frontend-design skill for the UI pass).
7. Playwright e2e with the API mocked via `page.route` (no real model calls in tests): open chat, stream a reply with thinking, stop, new / rename / delete conversation, back to select.
8. One live smoke test with your key (cost: a few cents), then `security-review` and `/simplify`; update CLAUDE.md (backend layout, commands, provider conventions).
9. Merge after your OK.

## Verification
- `npm run test:api` (pytest) and `npm test` / `npm run e2e` all pass; typecheck, lint (ruff + oxlint) and build are clean.
- Live check via Playwright MCP with the real API: send a message, watch thinking then answer stream, reload the page and the conversation persists (Postgres), switch conversations.
- `docker compose down && up` keeps the data (named volume).

## Out of scope (named, not built)
- Bedrock and OpenAI adapters and their characters (next phase).
- Equipped items becoming capabilities (M3).
- Auth/users, deployment, rate limiting.
- Syntax highlighting.
- AI-generated titles.
- Editing earlier messages (history is append-only).
- URL routing for chats.
