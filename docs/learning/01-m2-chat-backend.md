# 01 · M2 — The chat backend

> **Stage:** Milestone 2 (merged 2026-10-23) · **Code:** `apps/api/` · **Spec:** [`m2-chat-design`](../superpowers/specs/2026-10-22-weevil-m2-chat-design.md)
>
> Open each file next to its section. Words in **bold** the first time are in the [glossary](glossary.md).

## What this stage built

Before M2, weevil was only a browser app. M2 added a **Python server** that does three things:

1. **Talks to Claude** for the browser. The API key stays on the server, because anything sent to a browser can be read by anyone.
2. **Saves conversations** in a Postgres database, so chats survive a page refresh.
3. **Streams replies** token by token using **Server-Sent Events (SSE)**, so text appears while Claude is still writing.

## The big picture

```
Browser (React)                     apps/api (FastAPI, port 8787)                         Outside world
───────────────                     ─────────────────────────────                         ─────────────
fetch('/api/...')                   main.py ── app + CORS + routers
   │                                  │
   ▼                                  ├─ routes/conversations.py  list / create / rename / delete chats
Vite dev server ── proxies /api ──►   │                                     │
(port 5173)                           └─ routes/chat.py  POST a message ────┼──► providers/anthropic.py ──► Claude API
                                          │        ▲ streams SSE back       │         (implements
                                          │        └────────────────────────┘          providers/base.py)
                                          ▼
                                      db.py + models.py ──(SQLAlchemy, asyncpg)──► Postgres 17 (Docker)
                                      characters.py: which model/prompt each character uses
                                      config.py: settings from apps/api/.env
```

**One chat message, end to end** (`POST /api/conversations/{id}/messages`):

1. The browser sends `{"text": "Hi"}`. Vite forwards anything under `/api` to `localhost:8787`.
2. FastAPI checks the body against `SendMessage` (must be 1–32,000 characters after trimming).
3. `chat.py` loads the conversation and finds its character in `characters.py`, then picks that character's provider.
4. It saves your message to Postgres, loads the earlier messages and builds the `history` list.
5. It returns an `EventSourceResponse`. While the provider streams `ThinkingDelta`/`TextDelta` events, each one is forwarded to the browser as an SSE event.
6. When the provider yields `Done`, the full assistant reply is saved, and a final `done` event goes to the browser.

---

## Part 1 — Tooling: how the Python project is set up

### `apps/api/pyproject.toml`: the project's identity card

This is Python's equivalent of `package.json`: name, Python version, dependencies, and tool settings.

```toml
[project]
name = "weevil-api"
version = "0.1.0"
requires-python = ">=3.14"
dependencies = [
    "alembic>=1.20.1",
    "anthropic>=2.1.0",
    "asyncpg>=0.32.0",
    "fastapi>=0.161.1",
    "pydantic-settings>=2.16.1",
    "sqlalchemy[asyncio]>=2.1.6",
    "uvicorn[standard]>=0.54.0",
]
```

| Package | What it does here |
|---|---|
| `fastapi` | The web framework. You write functions, it turns them into HTTP endpoints. |
| `uvicorn` | The **ASGI** server that actually listens on port 8787 and hands requests to FastAPI. FastAPI is the app; uvicorn runs it. |
| `sqlalchemy[asyncio]` | The **ORM**: Python classes ↔ database tables, plus a query builder. `[asyncio]` is an "extra" that adds async support. |
| `asyncpg` | The low-level async **driver** SQLAlchemy uses to speak Postgres's wire protocol. |
| `alembic` | Database **migrations**: versioned scripts that create/alter tables. |
| `pydantic-settings` | Reads settings from environment variables and `.env` files into a typed class. |
| `anthropic` | The official Claude SDK. |

```toml
[dependency-groups]
dev = ["httpx>=0.28.1", "pytest>=9.1.1", "pytest-asyncio>=1.4.0", "ruff>=0.17.2"]
```

These dev-only tools are installed locally but aren't needed to *run* the app: an HTTP client for tests, the test runner, async test support, and **ruff** (linter + formatter, Python's ESLint + Prettier in one).

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "session"
asyncio_default_test_loop_scope = "session"
```

- `asyncio_mode = "auto"`: any `async def test_...` is run automatically on an event loop, so you don't have to mark each one.
- The two `session` settings mean every test shares one **event loop**. That matters because the database engine's connections belong to the loop that created them.

```toml
[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "ASYNC"]
```

These are rule families: pycodestyle errors, pyflakes (unused imports, undefined names), import sorting, "use newer syntax", bugbear (likely bugs), and async mistakes (e.g. a blocking call inside `async def`).

### `.python-version` and `uv`

`.python-version` just says `3.14`. **uv** reads it and handles everything else: it downloads that Python, creates a virtual environment in `apps/api/.venv`, and installs exact versions from `uv.lock` (the equivalent of `package-lock.json`).

- `uv run <cmd>` runs a command inside that environment, so you never "activate" anything.
- A **virtual environment** is a private folder of packages for one project, so projects never fight over versions.
- **`src/` layout:** the code lives in `src/weevil_api/`, not at the top level. Python can then only import it as the *installed* package, which stops tests from accidentally importing files by relative path. Every folder with an `__init__.py` is a **package** (an importable folder); `weevil_api.routes.chat` means `src/weevil_api/routes/chat.py`.

### `docker-compose.yml` (repo root): Postgres in a container

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: weevil
      POSTGRES_PASSWORD: weevil
      POSTGRES_DB: weevil
    ports:
      # Localhost only: the dev password must never be reachable from the network.
      - "127.0.0.1:5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      # Creates the weevil_test database on first start.
      - ./infra/postgres:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U weevil -d weevil"]
```

- **Docker** runs Postgres in an isolated **container**, so you don't install Postgres on Windows itself. `image: postgres:17` is the official image.
- `ports` maps the container's 5432 to *your machine's* 5432. Binding to `127.0.0.1` means only your own computer can connect, not other devices on your Wi-Fi.
- A `volume` (`pgdata`) keeps the data when the container is deleted. Without it, every restart would wipe your chats.
- Postgres runs any `.sql` file in `/docker-entrypoint-initdb.d` on its *first* start. `infra/postgres/01-test-db.sql` contains `CREATE DATABASE weevil_test OWNER weevil;`, so tests get their own database and never touch your real chats.
- `healthcheck` + `npm run db:up` (`docker compose up -d --wait`) waits until Postgres actually accepts connections.

### `apps/api/.env.example`

```
ANTHROPIC_API_KEY=
DATABASE_URL=postgresql+asyncpg://weevil:weevil@localhost:5432/weevil
```

You copy this to `.env` (which is gitignored) and fill in the key. The URL reads as `driver://user:password@host:port/database`. The `+asyncpg` part tells SQLAlchemy which driver to use.

---

## Part 2 — The app code, file by file

Files are in dependency order: each one only imports files explained before it.

### `config.py`: typed settings

**Job:** load configuration once, with types. **Used by:** `db.py`, `main.py`, `routes/chat.py`, `alembic/env.py`.

```python
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: SecretStr | None = None
    database_url: str = "postgresql+asyncpg://weevil:weevil@localhost:5432/weevil"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5199"]
```

- `class Settings(BaseSettings)` is **inheritance**: `Settings` gets all of `BaseSettings`'s behaviour, and you only declare fields.
- `anthropic_api_key: SecretStr | None = None` is a **type hint** plus a default. Read it as "this field is a `SecretStr` *or* `None`, and starts as `None`". `X | None` is how Python writes "optional".
- **Pydantic** does the work. When `Settings()` is created, it looks for an environment variable named after each field (case-insensitive: `ANTHROPIC_API_KEY` → `anthropic_api_key`), then for the same name in `.env`, then falls back to the default. It also **converts and validates** values: `cors_origins` would accept a JSON list from the environment.
- `SecretStr` wraps the key so that `print(settings)` shows `**********`. You have to call `.get_secret_value()` deliberately to see it. That stops the key leaking into logs.
- `extra="ignore"`: unrelated variables in `.env` don't cause errors.

```python
settings = Settings()
if settings.anthropic_api_key is not None and not settings.anthropic_api_key.get_secret_value().strip():
    settings.anthropic_api_key = None
```

- This is a **module-level singleton**. Python runs a module's top-level code once, on first import, and caches the module. Every `from weevil_api.config import settings` therefore gets the *same* object.
- The `if` handles `ANTHROPIC_API_KEY=` left blank in `.env`. Pydantic would make that an empty string; turning it into `None` lets the SDK fall back to its own credential lookup.

### `db.py`: the database connection

**Job:** create the connection pool and hand out sessions. **Used by:** `models.py` (`Base`), routes (`get_session`, `SessionLocal`), tests (`engine`).

```python
engine = create_async_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
```

- The **engine** owns a **connection pool**: a few open connections to Postgres that are reused, because opening a new one per request is slow. `pool_pre_ping=True` checks a connection still works before using it, so a Postgres restart doesn't crash the next request.
- `SessionLocal` is a **factory**: calling `SessionLocal()` makes a new **session**. A session is your "unit of work". You `add` objects and change attributes, then `commit()` writes everything in one **transaction** (all or nothing).
- `expire_on_commit=False`: by default SQLAlchemy "forgets" attribute values after a commit and reloads them on next access. In async code, that hidden reload would fail, so we keep the values.

```python
class Base(DeclarativeBase):
    pass
```

Every table class inherits from `Base`. `Base.metadata` collects all their table definitions; Alembic and the tests read it. `pass` means "empty body".

```python
async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
```

This short function packs in three big ideas:

- **`async def`** makes a **coroutine**: a function that can pause at each `await` and let the server handle other requests while it waits on the network or database. This is how one Python process serves many users at once.
- **`yield`** makes it a **generator**: it produces a value and *pauses* until resumed. Here it yields one session.
- **`async with`** is an async **context manager**: it guarantees cleanup. When the `with` block ends (normally *or* because of an error), the session is closed and its connection goes back to the pool.

FastAPI uses this as a **dependency** (see `Depends` in `conversations.py`). It runs the code up to `yield` before your endpoint, gives the endpoint the session, and runs the cleanup after the response.

### `models.py`: the tables, as Python classes

**Job:** define the `conversations` and `messages` tables. **Used by:** routes, Alembic.

```python
def utcnow() -> datetime:
    return datetime.now(UTC)
```

This returns a *timezone-aware* timestamp. Always store UTC; convert to local time only for display.

```python
class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    character_id: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(200), default=DEFAULT_TITLE)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
```

- This is SQLAlchemy 2.0's **declarative** style. Each `Mapped[...]` annotated attribute becomes a column, and the type hint sets both the Python type and (by default) whether the column can be NULL: `Mapped[str]` is NOT NULL, `Mapped[str | None]` allows NULL.
- `default=uuid.uuid4`: note there are no `()`. You pass the *function*, so SQLAlchemy calls it for each new row and every row gets a fresh random **UUID**. UUIDs are unguessable, so nobody can try `/conversations/1`, `/2`, …
- `default=` runs in Python; `server_default=func.now()` makes *Postgres* fill in the time (`DEFAULT now()` in SQL).
- `index=True` builds an **index**, a sorted lookup structure. `character_id` is indexed because we filter by it; `updated_at` because we sort by it.

```python
class Message(Base):
    __tablename__ = "messages"

    # Monotonic id gives turn order; history is append-only.
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(16))
    # Exact provider content blocks, replayed verbatim on later turns.
    content: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    text: Mapped[str] = mapped_column(Text, default="")
    stop_reason: Mapped[str | None] = mapped_column(String(32), default=None)
```

- Messages use an auto-incrementing integer id. Higher id = later message, so `ORDER BY id` gives turn order with no timestamp ties.
- A **foreign key** says that every message belongs to a real conversation; Postgres rejects a message pointing at a missing one. `ondelete="CASCADE"` means deleting a conversation also deletes its messages.
- `content` is **JSONB**: Postgres stores JSON in a binary, queryable form. We store Claude's reply *exactly* as returned (thinking blocks with their signatures, text blocks…) because the API requires them unchanged when they're sent back next turn.
- `text` is a plain-text copy for display, so the UI doesn't need to dig through blocks.
- `list[dict[str, Any]]` reads as "a list of dictionaries with string keys and values of any type". `Any` switches type checking off for those values.

### `alembic/env.py` + `alembic/versions/3d984b78ec11_…py`: migrations

**Job:** create and evolve the real tables in Postgres. Run with `npm run db:migrate` (`uv run alembic upgrade head`).

**Why migrations?** `models.py` describes what the tables *should* look like. A live database with real data can't just be wiped and recreated. Each migration is a small versioned script ("add this column"), and Alembic records in a table called `alembic_version` which scripts have already run.

Most of `env.py` is Alembic's async template. The weevil-specific lines are:

```python
from weevil_api import models  # noqa: E402,F401  (registers tables on Base.metadata)
from weevil_api.config import settings  # noqa: E402
from weevil_api.db import Base  # noqa: E402

config.set_main_option("sqlalchemy.url", settings.database_url)
target_metadata = Base.metadata
```

- Importing `models` looks unused, but defining the classes is what *registers* the tables on `Base.metadata`, so the import has a **side effect**. `# noqa: E402,F401` tells ruff "yes, import not at top, and unused, on purpose".
- The database URL comes from `settings`, so there's a single source of truth.
- `target_metadata` lets `alembic revision --autogenerate -m "..."` compare your models with the live DB and *write* the migration for you.

```python
async def run_async_migrations() -> None:
    connectable = async_engine_from_config(..., poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
```

Alembic itself is synchronous, so `run_sync` runs the synchronous migration code over an async connection. `NullPool` = no pooling; it's a one-off script.

The migration file was autogenerated, then checked by hand:

```python
revision: str = "3d984b78ec11"
down_revision: str | Sequence[str] | None = None

def upgrade() -> None:
    op.create_table(
        "conversations",
        sa.Column("id", sa.Uuid(), nullable=False),
        ...
    )
    op.create_index(op.f("ix_conversations_character_id"), "conversations", ["character_id"], unique=False)
    ...

def downgrade() -> None:
    op.drop_index(op.f("ix_messages_conversation_id"), table_name="messages")
    op.drop_table("messages")
    ...
```

- `down_revision = None` means this is the first migration. The next one will say `down_revision = "3d984b78ec11"`, forming a chain.
- `upgrade()` applies the change; `downgrade()` undoes it, in reverse order (messages are dropped before conversations, because of the foreign key).

### `characters.py`: who each character *is*

**Job:** server-side registry of each character's provider, model and personality. **Used by:** routes, providers.

```python
Provider = Literal["anthropic"]  # "bedrock" and "openai" join with their characters.
Effort = Literal["low", "medium", "high", "xhigh", "max"]
```

A **`Literal` type** allows only those exact strings. Your editor and type checker flag `provider="anthorpic"` as an error.

```python
@dataclass(frozen=True)
class CharacterConfig:
    id: str
    name: str
    provider: Provider
    model: str
    system: str
    effort: Effort = "medium"
    fallbacks: bool = True
```

- `@dataclass` is a **decorator**: a function that takes the class and returns an enhanced version. It writes `__init__`, `__repr__` and `__eq__` for you from the annotated fields, so `CharacterConfig(id="clawd", ...)` just works.
- `frozen=True` makes instances immutable: assigning `config.model = ...` raises an error. Config shouldn't change while the server runs.

```python
CHARACTERS: dict[str, CharacterConfig] = {
    "clawd": CharacterConfig(
        id="clawd",
        name="Claude",
        provider="anthropic",
        model="claude-haiku-5-5",
        system=("You are Claude, made by Anthropic. ..."),
        fallbacks=False,
    ),
}
```

**Security point:** the browser only ever sends `"clawd"`. If the client could send a model name, anyone could make your server call your most expensive model with your key. The server decides; this is "never trust the client".

### `providers/base.py`: one interface for every AI vendor

**Job:** define what *any* model adapter must look like, so routes never care whether it's Claude, Bedrock or OpenAI. **Used by:** `providers/anthropic.py`, `routes/chat.py`, tests.

```python
@dataclass
class ThinkingDelta:
    text: str

@dataclass
class TextDelta:
    text: str

@dataclass
class Done:
    """The finished reply. `content` is stored and replayed verbatim on the next turn."""

    content: list[dict[str, Any]]
    text: str
    stop_reason: str | None
    usage: dict[str, Any] = field(default_factory=dict)

ErrorKind = Literal["auth", "rate_limit", "overloaded", "connection", "api"]

@dataclass
class ProviderError:
    kind: ErrorKind
    message: str

ChatEvent = ThinkingDelta | TextDelta | Done | ProviderError
```

- These are the four **events** a stream can produce: small chunks of thinking, small chunks of answer text, then *either* `Done` (the full reply) *or* `ProviderError`.
- `field(default_factory=dict)`: a default of `{}` would be **shared** between every instance (a classic Python trap), so `default_factory` calls `dict()` to make a fresh one each time.
- `ChatEvent = A | B | C | D` is a **type alias** for a union: "a `ChatEvent` is one of these four".
- The triple-quoted string under a class or function is its **docstring**: documentation that editors show on hover.

```python
class ChatProvider(Protocol):
    def stream(self, character: CharacterConfig, history: list[dict[str, Any]]) -> AsyncIterator[ChatEvent]:
        """Stream one assistant turn for `history` (provider-native message dicts)."""
        ...
```

- A **`Protocol`** describes a *shape*, not a parent class: "anything with a `stream(character, history)` method that returns an async iterator of `ChatEvent`s". `AnthropicProvider` never inherits from it, and neither does the test's `FakeProvider`; they just have the right method. This is **structural typing** ("duck typing", checked by the type checker).
- `...` (Ellipsis) is a placeholder body.
- This is the **adapter pattern**: adding Bedrock later means writing `BedrockProvider` with a `stream` method. `chat.py` doesn't change.

### `providers/anthropic.py`: the Claude adapter

**Job:** turn a `CharacterConfig` + history into a streaming Claude API call, and translate the SDK's events/errors into our `ChatEvent`s. **Used by:** `routes/chat.py`.

```python
MAX_TOKENS = 64_000
FALLBACK_BETA = "server-side-fallback-2026-07-01"
_INTERNAL = {"thinking", "redacted_thinking", "tool_use", "server_tool_use"}
```

- `64_000`: underscores in numbers are just for readability.
- `{...}` with plain values (no `key: value`) is a **set**, which gives fast "is this in it?" checks.
- A leading `_` is a convention for "private to this module".

```python
def replayable(content: list[dict[str, Any]]) -> list[dict[str, Any]]:
    last = max((i for i, b in enumerate(content) if b.get("type") == "fallback"), default=-1)
    return [b for i, b in enumerate(content) if i > last or b.get("type") not in _INTERNAL]
```

- If a reply had a mid-stream **fallback** (the request was retried on another model), the model-internal blocks from *before* the last fallback marker must not be sent back. Everything else is echoed back unchanged.
- `enumerate(content)` gives `(index, item)` pairs.
- `(i for ... if ...)` is a **generator expression**: a lazy loop, consumed by `max`. `default=-1` is used when there's no fallback, so the condition `i > -1` keeps everything.
- `[b for ... if ...]` is a **list comprehension**: build a new list by filtering, in one line.
- `b.get("type")` returns `None` instead of crashing when the key is missing.

```python
class AnthropicProvider:
    def __init__(self, client: anthropic.AsyncAnthropic):
        self.client = client
```

- `__init__` is the constructor; `self` is the instance (like `this` in JS, but written explicitly).
- The client is **passed in** rather than created inside. That's **dependency injection**: tests pass a `FakeClient`, so no real API is ever called.

```python
    async def stream(self, character, history) -> AsyncIterator[ChatEvent]:
        params: dict[str, Any] = {
            "model": character.model,
            "max_tokens": MAX_TOKENS,
            "system": character.system,
            "messages": history,
            "thinking": {"type": "adaptive", "display": "summarized"},
            "output_config": {"effort": character.effort},
            "cache_control": {"type": "ephemeral"},
        }
        if character.fallbacks:
            params |= {"betas": [FALLBACK_BETA], "fallbacks": "default"}
```

- `async def` + `yield` inside = an **async generator**. Callers consume it with `async for event in provider.stream(...)`, receiving events one at a time *as they arrive*.
- The request turns on adaptive thinking (Claude decides how much to think, and we receive a summary), an effort level, and **prompt caching** (`cache_control`), which makes repeated long histories cheaper and faster.
- `params |= {...}` merges a dict into `params` in place.

```python
        try:
            async with self.client.beta.messages.stream(**params) as stream:
                async for event in stream:
                    if event.type != "content_block_delta":
                        continue
                    if event.delta.type == "thinking_delta":
                        yield ThinkingDelta(event.delta.thinking)
                    elif event.delta.type == "text_delta":
                        yield TextDelta(event.delta.text)
                final = await stream.get_final_message()
```

- `**params` **unpacks** the dict into keyword arguments: `stream(model=..., max_tokens=..., ...)`.
- `async with` opens the HTTP stream and guarantees it's closed afterwards, even if the browser disconnects mid-reply.
- We only forward the small **delta** events. When the stream ends, `get_final_message()` returns the complete, assembled message.

```python
        except anthropic.AuthenticationError, anthropic.PermissionDeniedError:
            yield ProviderError("auth", "The API key was rejected. Check ANTHROPIC_API_KEY in apps/api/.env.")
            return
        except anthropic.RateLimitError:
            yield ProviderError("rate_limit", ...)
            return
        except anthropic.APIStatusError as e:
            if e.status_code == 529:
                yield ProviderError("overloaded", ...)
            else:
                yield ProviderError("api", f"The Claude API returned an error ({e.status_code}).")
            return
```

- `try/except` is Python's try/catch. **Order matters**: `RateLimitError` is a *subclass* of `APIStatusError`, so the specific one must come first or the general one would catch it.
- `except A, B:` without parentheses is new in **Python 3.14** (PEP 758). Older Pythons need `except (A, B):`.
- `as e` binds the exception object. `f"...{e.status_code}..."` is an **f-string** (like JS template literals).
- Errors become `ProviderError` *events* instead of exceptions, so the route can show a friendly message in the chat. A bare `return` in a generator ends the stream.

```python
        if final.stop_reason == "refusal":
            yield Done(content=[], text="", stop_reason="refusal")
            return
        content = [b.model_dump(mode="json", exclude_none=True) for b in final.content]
        text = "".join(b["text"] for b in content if b.get("type") == "text")
        usage = {"input_tokens": final.usage.input_tokens, "output_tokens": final.usage.output_tokens}
        yield Done(content=content, text=text, stop_reason=final.stop_reason, usage=usage)
```

- A refusal saves an *empty* reply: the partial text isn't a real answer, and an empty turn is never replayed.
- `model_dump(mode="json")` turns the SDK's Pydantic objects into plain JSON-safe dicts that Postgres can store as JSONB.
- `"".join(...)` concatenates all text blocks into one string.

### `routes/conversations.py`: CRUD endpoints for chats

**Job:** list/create/rename/delete conversations and list messages. Also exports helpers that `chat.py` reuses. **Used by:** `main.py`, `chat.py`.

```python
router = APIRouter(prefix="/api")
Session = Annotated[AsyncSession, Depends(get_session)]
```

- An **`APIRouter`** is a group of endpoints that `main.py` plugs into the app. `prefix="/api"` is added to every path.
- `Annotated[Type, extra]` attaches extra metadata to a type. FastAPI reads `Depends(get_session)` from it. Any endpoint parameter typed `session: Session` gets a fresh DB session from `get_session`, closed after the request. Defining the alias once keeps every endpoint short.

```python
class ConversationOut(BaseModel):
    id: uuid.UUID
    character_id: str
    title: str
    updated_at: datetime

class Rename(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
```

- **Pydantic `BaseModel`s** define the shape of JSON going *in* and *out*. `ConversationOut` controls exactly which fields the browser sees (`created_at` stays private).
- For inputs, validation is automatic. A body like `{"title": "   "}` is stripped to empty, fails `min_length=1`, and FastAPI replies **422 Unprocessable Entity** before your code runs. This is validation at the **trust boundary**.

```python
def message_out(m: Message) -> MessageOut:
    thinking = "\n\n".join(b.get("thinking", "") for b in m.content if b.get("type") == "thinking")
    return MessageOut(id=m.id, role=m.role, text=m.text, thinking=thinking.strip(), ...)

def require_character(character_id: str) -> None:
    if character_id not in CHARACTERS:
        raise HTTPException(404, "Unknown character")

async def get_conversation(session: AsyncSession, conversation_id: uuid.UUID) -> Conversation:
    conversation = await session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(404, "Conversation not found")
    return conversation
```

- `message_out` converts a database row into the API shape, pulling the thinking summary out of the JSON blocks.
- `raise HTTPException(404, ...)` stops the request immediately; FastAPI turns it into a 404 JSON response. Helpers raise so that endpoints stay linear (no `if not found: return ...` everywhere).
- `session.get(Model, primary_key)` is a lookup by primary key, and returns `None` if the row doesn't exist.

```python
async def conversation_messages(session: AsyncSession, conversation_id: uuid.UUID) -> list[Message]:
    rows = await session.scalars(
        select(Message).where(Message.conversation_id == conversation_id).order_by(Message.id)
    )
    return list(rows)
```

- `select(...).where(...).order_by(...)` is SQLAlchemy's **query builder**. It becomes `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY id`.
- `Message.conversation_id == conversation_id` doesn't evaluate to `True`/`False`. SQLAlchemy overloads `==` on columns to build a SQL condition, and the value is sent as a **bound parameter**, which prevents **SQL injection**.
- `session.scalars` returns model objects (not raw tuples).

```python
@router.get("/characters/{character_id}/conversations")
async def list_conversations(character_id: str, session: Session) -> list[ConversationOut]:
    require_character(character_id)
    rows = await session.scalars(
        select(Conversation)
        .where(Conversation.character_id == character_id)
        .order_by(Conversation.updated_at.desc())
    )
    return [ConversationOut.model_validate(c, from_attributes=True) for c in rows]
```

- `@router.get(path)` is a decorator that **registers** the function as the handler for `GET` on that path.
- FastAPI reads the **function signature** to work out where each parameter comes from:
  - `{character_id}` in the path becomes the `character_id: str` argument.
  - The `Session` type becomes the dependency.
  - A `BaseModel` parameter (like `body: Rename` below) is read from the JSON body.
  - The return type annotation defines the response schema and filters the output.
- `model_validate(c, from_attributes=True)` builds the Pydantic model by reading attributes off the ORM object.
- FastAPI also generates interactive API docs from all of this. With the API running, open **http://localhost:8787/docs**.

```python
@router.post("/characters/{character_id}/conversations", status_code=201)
async def create_conversation(character_id: str, session: Session) -> ConversationOut:
    require_character(character_id)
    conversation = Conversation(character_id=character_id, updated_at=utcnow())
    session.add(conversation)
    await session.commit()
    return ConversationOut.model_validate(conversation, from_attributes=True)
```

`201 Created` is the correct status for "made a new thing". `add` + `commit` is how you insert a row with the ORM.

Rename (`PATCH`) and delete (`DELETE`, returns `204 No Content`) follow the same pattern. Deleting relies on the database's `CASCADE` to remove the messages.

### `routes/chat.py`: sending a message and streaming the reply

**Job:** the core endpoint. **Used by:** `main.py`.

```python
@cache
def get_providers() -> dict[str, ChatProvider]:
    key = settings.anthropic_api_key.get_secret_value() if settings.anthropic_api_key else None
    return {"anthropic": AnthropicProvider(anthropic.AsyncAnthropic(api_key=key))}

Providers = Annotated[dict[str, ChatProvider], Depends(get_providers)]
```

- `@cache` (from `functools`) **memoizes**: the function runs once and every later call returns the same dict. That gives one shared SDK client with one connection pool.
- `A if cond else B` is Python's **ternary** expression.
- Because providers come from `Depends(get_providers)`, tests can **override** the dependency with fakes (see `conftest.py`). This is the main reason for using DI here.

```python
def sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"
```

The **SSE wire format** is plain text: an `event:` line, a `data:` line, and a blank line ending each event. `json.dumps` turns a dict into a JSON string.

```python
def history_of(messages: list[Message]) -> list[dict[str, Any]]:
    # Refused or failed assistant turns are stored empty for display but never replayed.
    return [
        {"role": m.role, "content": replayable(m.content) if m.role == "assistant" else m.content}
        for m in messages
        if m.content
    ]
```

This turns stored rows into the `messages` list the API expects. `if m.content` skips empty turns (an empty list is **falsy** in Python, as are `""`, `0` and `None`).

```python
@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: uuid.UUID, body: SendMessage, session: Session, providers: Providers
) -> EventSourceResponse:
    conversation = await get_conversation(session, conversation_id)
    character = CHARACTERS.get(conversation.character_id)
    if character is None:
        raise HTTPException(404, "Unknown character")
    provider = providers[character.provider]

    previous = await conversation_messages(session, conversation_id)
    user = Message(conversation_id=conversation_id, role="user",
                   content=[{"type": "text", "text": body.text}], text=body.text)
    session.add(user)
    if not previous and conversation.title == DEFAULT_TITLE:
        conversation.title = title_from(body.text)
    conversation.updated_at = utcnow()
    await session.commit()
    history = history_of([*previous, user])
```

- `uuid.UUID` as a path type: FastAPI rejects `/conversations/banana/messages` with 422 automatically.
- Your message is **committed before** calling the model, so it's saved even if Claude fails.
- `[*previous, user]` **unpacks** the old list into a new one plus the new message (like JS `[...previous, user]`).
- The first message becomes the chat's title (trimmed to 60 characters by `title_from`).

```python
    async def events() -> AsyncIterator[str]:
        yield sse("user", {"message": user_out})
        try:
            async for event in provider.stream(character, history):
                match event:
                    case ThinkingDelta(text=text):
                        yield sse("thinking", {"text": text})
                    case TextDelta(text=text):
                        yield sse("text", {"text": text})
                    case ProviderError(kind=kind, message=message):
                        yield sse("error", {"kind": kind, "message": message})
                        return
                    case Done():
                        reply = await save_reply(conversation_id, event)
                        yield sse("done", {"message": reply, "title": title})
        except Exception:
            log.exception("Chat stream failed for conversation %s", conversation_id)
            yield sse("error", {"kind": "api", "message": UNEXPECTED})

    return EventSourceResponse(events())
```

- `events` is a **nested function** (defined inside another). It's a **closure**: it can use `provider`, `history`, `title` and the other variables from the outer function.
- `EventSourceResponse` sends headers immediately, then sends each string the generator yields as soon as it's produced. That's the streaming.
- **`match`/`case`** is structural **pattern matching**. `case TextDelta(text=text):` means "if the event is a `TextDelta`, pull its `.text` into a variable called `text`". It's a type check and destructuring in one step.
- Once streaming starts, the `200` status line has already been sent, so an error can't become a `500` any more. Instead, the `except Exception` reports it *inside* the stream. `log.exception` writes the full traceback to your API terminal; the browser only gets a safe generic message.
- If the browser disconnects, the generator is **cancelled** before `Done`, so no half-written reply is saved.

```python
async def save_reply(conversation_id: uuid.UUID, done: Done) -> dict[str, Any]:
    # A fresh session: the request-scoped one may already be closed while the response streams.
    async with SessionLocal() as session:
        reply = Message(conversation_id=conversation_id, role="assistant",
                        content=done.content, text=done.text, stop_reason=done.stop_reason)
        session.add(reply)
        ...
        await session.commit()
```

**This is a subtle bug to avoid.** The request's `session` dependency may be cleaned up once the endpoint *returns* the response object, but streaming continues after that. So saving the reply opens its own short-lived session.

### `main.py`: wiring it all together

**Job:** create the FastAPI app. uvicorn imports `weevil_api.main:app` (module path : variable name).

```python
if settings.anthropic_api_key is None and "ANTHROPIC_API_KEY" not in os.environ:
    logging.getLogger("weevil_api").warning("No ANTHROPIC_API_KEY configured: ...")

app = FastAPI(title="weevil API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)
app.include_router(conversations.router)
app.include_router(chat.router)

@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

- The startup warning turns "why doesn't chat work?" into an obvious message in the terminal.
- **Middleware** wraps every request. **CORS** (Cross-Origin Resource Sharing) is the browser rule that blocks a page on one origin (e.g. `localhost:5173`) from reading responses from another (`localhost:8787`) unless the server allows it. In dev, the Vite proxy makes everything same-origin anyway, so this is a safety net for running the API on its own.
- `include_router` attaches each router's endpoints to the app.
- `/api/health` is a tiny endpoint that deployment platforms (and you) can ping to check the server is alive.

---

## Part 3 — Tests (`apps/api/tests/`)

Run with `npm run test:api`. They need Postgres running (`npm run db:up`) and **never** call the real Claude API.

### `conftest.py`: shared test setup

pytest automatically loads `conftest.py` and makes its **fixtures** available to every test. A fixture is setup code that a test requests by naming it as a parameter: `async def test_x(client, provider)` gets both.

```python
os.environ["DATABASE_URL"] = "postgresql+asyncpg://weevil:weevil@localhost:5432/weevil_test"
```

This line comes **before** any `weevil_api` import, so the `settings` singleton is created pointing at `weevil_test`. Import order is behaviour here.

```python
@pytest.fixture(scope="session", autouse=True)
async def schema():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

@pytest.fixture(autouse=True)
async def clean_tables():
    async with engine.begin() as conn:
        await conn.execute(text("TRUNCATE conversations, messages RESTART IDENTITY CASCADE"))
```

- `scope="session"`: `schema` runs once for the whole test run. It rebuilds the tables straight from the models (no migrations needed for tests). The code after `yield` is the **teardown**.
- `autouse=True`: it runs without being requested. `clean_tables` empties the tables before *every* test, so tests can't affect each other.

```python
class FakeProvider:
    def __init__(self, events):
        self.events = events
        self.histories = []

    async def stream(self, character, history):
        self.histories.append(history)
        for event in self.events:
            yield event

@pytest.fixture
def provider():
    fake = FakeProvider([])
    app.dependency_overrides[get_providers] = lambda: {"anthropic": fake}
    yield fake
    app.dependency_overrides.clear()
```

- `FakeProvider` matches the `ChatProvider` protocol (thanks to structural typing, no inheritance needed). It replays scripted events and **records** the history it received, so tests can check exactly what would have been sent to Claude.
- `app.dependency_overrides` is FastAPI's built-in **test seam**: "whenever an endpoint asks for `get_providers`, use this instead". `lambda: ...` is an inline anonymous function.

```python
@pytest.fixture
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        yield c
```

`ASGITransport` sends requests **directly into the app in memory**, with no real network or port. It's fast, and it still exercises routing, validation, dependencies and the database for real.

### `test_routes.py`: endpoint behaviour

These are **integration tests**: real FastAPI and a real Postgres, with a fake model. Examples:

- `test_conversation_crud`: create, rename (checks the whitespace is stripped), list order, delete, and that deleted chats return 404.
- `test_chat_streams_saves_both_turns_and_titles_the_conversation`: scripts a fake reply, then checks the exact SSE event sequence `["user", "thinking", "text", "text", "done"]`, the saved messages and the auto title.
- `test_history_replays_assistant_blocks_verbatim`: the second request must resend the first reply's blocks *unchanged* (signature included).
- `test_errors_and_refusals_save_no_assistant_turn_to_replay`: failed and refused turns are shown in the chat but never sent back to the model.

The `sse_events` helper parses the response body the same way a browser would.

### `test_anthropic_provider.py`: the adapter in isolation

These are **unit tests** with no database and no network. They use a `FakeClient` that mimics just enough of the SDK (`client.beta.messages.stream(...)` returning an async context manager you can `async for` over):

- `FakeStream` implements `__aenter__`/`__aexit__` (which make `async with` work) and `__aiter__` (which makes `async for` work). These are **dunder methods** ("double underscore"), the hooks behind Python's syntax.
- `SimpleNamespace` (imported as `NS`) makes quick objects with attributes, such as `NS(type="content_block_delta", delta=...)`.
- These tests check:
  - the request parameters sent to the API;
  - that SDK errors map to the right `ProviderError.kind`;
  - that a refusal discards partial text;
  - that `replayable` drops the right blocks.

---

## Frontend recap (short)

- `apps/web/src/api/client.ts`: a typed `api` object for the REST endpoints, plus `parseSSE` and `streamChat`. Streaming uses `fetch` + a `ReadableStream` reader (not `EventSource`, which can't `POST`), and an `AbortSignal` stops it. `sse.test.ts` unit-tests the parser.
- `apps/web/src/chat/`: `ChatScreen` (full-screen chat), `ConversationList` (sidebar with rename/delete), `Composer` (input box), `MessageView` (Markdown rendering plus a collapsible thinking summary), `messages.ts` (`toUi` turns API messages into UI messages).
- The speech bubble in the select view opens the chat.
- `vite.config.ts` proxies `/api` → `http://localhost:8787`.
- `e2e/mockApi.ts`: Playwright tests mock the whole API in memory, so e2e tests never call a model.

---

## Try it yourself

1. **Explore the generated docs.** Run `npm run db:up` and `npm run dev:api`, then open http://localhost:8787/docs. Try `POST /api/characters/clawd/conversations` from the page and see the row appear.
2. **Change an endpoint.** Make `/api/health` also return `"characters": len(CHARACTERS)`. Write a test for it in `test_routes.py` using the `client` fixture, then run `npm run test:api`.
3. **Add a validation rule.** Give `Rename.title` a `max_length` of 100. Then add an assertion to `test_unknown_character_and_bad_input_are_rejected` that a 101-character title returns 422.
4. **Write a migration.** Add `pinned: Mapped[bool] = mapped_column(default=False, server_default="false")` to `Conversation`. The `server_default` gives existing rows a value; without one, adding a NOT NULL column to a table that already has data fails. Run `cd apps/api && uv run alembic revision --autogenerate -m "pin conversations"`, read the generated file, then run `npm run db:migrate`. (Undo it with `uv run alembic downgrade -1` and delete the file if you don't want to keep it.)
