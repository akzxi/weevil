# weevil learning docs

These docs teach the backend and AI side of weevil one stage at a time. Each stage doc explains every new or changed backend file:

- what the file is for;
- which files use it;
- its code in chunks, each followed by a plain-English explanation of the Python and library concepts in it.

Frontend changes get a short recap only.

## Stages

| # | Stage | What you'll learn |
|---|---|---|
| [01](01-m2-chat-backend.md) | M2: chat backend | uv & project layout, FastAPI, Pydantic, async/await, SQLAlchemy + Postgres, Alembic migrations, the provider/adapter pattern, SSE streaming, pytest fixtures & fakes |

Also see:

- [Glossary](glossary.md): every term in **bold** in the stage docs, in one or two lines each.
- [AI engineering roadmap](ai-engineering-roadmap.md): where Hugging Face, LangChain, LangGraph, AWS, RAG and evals fit into weevil next.

## How to read them

- Open the source file next to its section. Code blocks are copied from the source. `...` marks lines left out, and a few long calls are reflowed onto fewer lines.
- Read in order inside a doc: files are arranged so each one only uses things already explained.
- Do the "Try it yourself" exercises at the end. Changing code and watching a test fail or pass teaches more than reading.

## Running the backend

From the repo root (Docker Desktop must be running):

```sh
npm run db:up        # start Postgres 17 in Docker (also creates the weevil_test database)
npm run db:migrate   # apply Alembic migrations to the weevil database
npm run dev:api      # FastAPI on http://localhost:8787 (interactive docs at /docs)
npm run dev          # the web app; Vite proxies /api to the API
npm run test:api     # pytest against weevil_test with fake model providers
npm run lint:api     # ruff lint + format check
```

Put your key in `apps/api/.env` (copy `apps/api/.env.example`). Never commit it.
