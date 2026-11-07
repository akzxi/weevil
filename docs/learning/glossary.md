# Glossary

A running list of terms from the stage docs, alphabetical. Each entry links to the stage where it first appears.

| Term | Meaning |
|---|---|
| **Adapter pattern** | One common interface, plus one small class per vendor that translates to it. `AnthropicProvider` adapts the Claude SDK to `ChatProvider`. [01] |
| **ASGI** | The standard interface between async Python web servers (uvicorn) and web apps (FastAPI). [01] |
| **async / await** | `async def` defines a coroutine. `await` pauses it until a slow operation (network, DB) finishes, letting the server handle other requests meanwhile. [01] |
| **Async generator** | An `async def` that uses `yield`. It produces values over time and is consumed with `async for`. Used for streaming. [01] |
| **Bound parameter** | A query value sent separately from the SQL text, so user input can never change the query. This is the defence against SQL injection. [01] |
| **Closure** | A nested function that remembers variables from the function it was defined in. [01] |
| **Connection pool** | A set of reusable open DB connections, because opening a new one per request is slow. [01] |
| **Context manager** | An object used with `with` / `async with` that guarantees cleanup (closing a session or stream) even on errors. Implemented with `__enter__`/`__exit__` (or `__aenter__`/`__aexit__`). [01] |
| **CORS** | A browser rule blocking pages from reading responses from another origin unless the server allows it. [01] |
| **Coroutine** | The object an `async def` function returns. It runs when awaited. [01] |
| **Dataclass** | `@dataclass` auto-writes `__init__`, `__repr__` and `__eq__` from annotated fields. `frozen=True` makes instances immutable. [01] |
| **Decorator** | `@something` above a function or class: a function that wraps or registers it. Examples: `@router.get`, `@dataclass`, `@cache`. [01] |
| **Dependency injection (DI)** | Passing in what a function needs instead of creating it inside. In FastAPI, `Depends(fn)` does this, and tests swap dependencies with `app.dependency_overrides`. [01] |
| **Docstring** | A triple-quoted string at the top of a module, class or function that documents it. [01] |
| **Dunder method** | A "double underscore" method like `__init__` or `__aiter__`. These are the hooks behind Python syntax. [01] |
| **Event loop** | The scheduler that runs coroutines, switching between them at each `await`. [01] |
| **Falsy** | A value treated as false in an `if`: `None`, `False`, `0`, `""`, `[]`, `{}`. [01] |
| **Fixture** | pytest setup and teardown code that a test requests by naming it as a parameter. It lives in `conftest.py` to be shared. [01] |
| **Foreign key** | A column that must match a row in another table. `ondelete="CASCADE"` deletes children with the parent. [01] |
| **f-string** | `f"Hello {name}"`: string interpolation, like JS template literals. [01] |
| **Generator / generator expression** | A function with `yield` (or `(x for x in ...)`) that produces values lazily, one at a time. [01] |
| **Index** | A sorted lookup structure on a column that makes filtering and sorting by it fast. [01] |
| **Integration test vs unit test** | Integration tests use real parts together (FastAPI + Postgres). Unit tests check one piece in isolation with fakes. [01] |
| **JSONB** | Postgres's binary JSON column type, which is queryable and compact. [01] |
| **List comprehension** | `[f(x) for x in items if cond]`: build a list in one expression. [01] |
| **Literal type** | `Literal["a", "b"]`: a type that allows only those exact values. [01] |
| **Memoize** | Cache a function's result so later calls return the same value. `functools.cache` does this. [01] |
| **Middleware** | Code that wraps every request and response, e.g. CORS. [01] |
| **Migration** | A versioned script that changes the database schema. Alembic tracks which ones have run. [01] |
| **Module-level singleton** | An object created at a module's top level. Python runs that code once, so every importer shares it (`settings`, `engine`). [01] |
| **ORM** | Object-Relational Mapper: Python classes ↔ tables, objects ↔ rows (SQLAlchemy). [01] |
| **Package** | A folder of Python modules, importable by dotted path (`weevil_api.routes.chat`). [01] |
| **Pattern matching** | `match x: case Type(field=v): ...` checks the type and pulls out fields in one step. [01] |
| **Protocol** | A type describing a required *shape* (methods/attributes). Any class with that shape fits; no inheritance is needed (structural typing). [01] |
| **Pydantic model** | A class (`BaseModel`) that validates and converts data, used for request/response bodies and settings. [01] |
| **Session (SQLAlchemy)** | A unit of work: track changes to objects, then `commit()` writes them in one transaction. [01] |
| **SSE** | Server-Sent Events: a one-way text stream from server to browser (`event:` / `data:` lines, with a blank line between events). [01] |
| **Transaction** | A group of DB changes that either all happen or none do. [01] |
| **Trust boundary** | Where untrusted input enters your system (an HTTP request). Validate everything there. [01] |
| **Type hint** | Annotations like `name: str` or `-> list[int]`. Python doesn't enforce them at runtime, but tools (and FastAPI/Pydantic/SQLAlchemy) use them. [01] |
| **Unpacking** | `*items` spreads a list and `**params` spreads a dict into keyword arguments. [01] |
| **UUID** | A random 128-bit id. Unguessable, unlike 1, 2, 3. [01] |
| **uv** | A fast Python project manager: installs Python, creates the virtual env, locks and installs dependencies, runs commands. [01] |
| **Virtual environment** | A per-project folder of installed packages (`apps/api/.venv`). [01] |

[01]: 01-m2-chat-backend.md
