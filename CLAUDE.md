# weevil

Animated AI-model sprites roam the screen; clicking one zooms it into a character-select view. Each character will become a chat wrapper for its model (Milestone 2+). Spec: `docs/superpowers/specs/2026-10-19-weevil-m1-design.md`.

## Layout
- `apps/web` — Vite + React 19 + TypeScript (strict) + Tailwind v4 + Motion + Zustand.
- `apps/api` — Python 3.14 FastAPI managed with `uv`; Postgres 17 via `docker-compose.yml` (SQLAlchemy async + asyncpg, Alembic migrations). Never call model APIs from the browser; keys live in `apps/api/.env` (gitignored).

## Commands (repo root)
- Web: `npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint` · `npm test` (Vitest) · `npm run e2e` (Playwright)
- API: `npm run db:up` · `npm run db:migrate` · `npm run dev:api` (port 8787; Vite proxies `/api`) · `npm run test:api` · `npm run lint:api`
- Commit subjects: `WEVL | Title Case Summary`.

## Conventions
- Characters are **data**: `src/characters/<id>/` exports a `CharacterDef` with a pixel `sprite` (frames per mode: idle/walk/held/land/selected, each a list of `{ rows, ms }`). Walk frames follow the wander hop counter so legs move with each step.
- All art is pixel art: grids of chars → `PixelArt` (`src/pixel/PixelArt.tsx`), rendered as crisp SVG rects. `.` is transparent.
- Items (`src/items/catalog.ts`) are skills or MCPs with an 8×8 `icon`, a `socket` (`head`/`hand`/`back`/`feet`) and a `capability` (consumed by the agent backend later).
- Loadouts live in the Zustand store (persisted to localStorage as `weevil:loadouts`); the rules are pure functions in `src/state/inventory.ts`. Worn items leave their grid, like Minecraft armour.
- Item drag & drop: `dragSource()` starts a drag, `DragLayer` moves the ghost, drop targets are `data-drop` attributes resolved by `dropAction()` (`src/drag/drag.ts`).
- Per-frame positions (wandering sprites, drag ghost) are written through refs — never put them in React state or Zustand.
- Colors come from theme tokens in `src/index.css`; no hard-coded hex in components (character/item palettes excepted). Minecraft UI uses `.mc-panel`, `.mc-slot`, `.mc-button`.
- Chat backend: `characters.py` is the source of truth for each character's provider/model (never trust the client). Providers implement `providers/base.py` `ChatProvider` and emit `ThinkingDelta`/`TextDelta`/`Done`/`ProviderError`; add Bedrock/OpenAI adapters there.
- Assistant `content` blocks are stored as returned and replayed verbatim (history is append-only); refused/failed turns are stored empty and never replayed.
- Respect `prefers-reduced-motion`.
- Pure logic is unit-tested with Vitest; visuals and drag flows are checked with Playwright in `apps/web/e2e`. Chat e2e tests use the in-memory mock in `e2e/mockApi.ts` — never call a real model from tests.
- API tests (pytest) run against the `weevil_test` database with fake providers.
