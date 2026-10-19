# weevil

Animated AI-model sprites roam the screen; clicking one zooms it into a character-select view. Each character will become a chat wrapper for its model (Milestone 2+). Spec: `docs/superpowers/specs/2026-10-19-weevil-m1-design.md`.

## Layout
- `apps/web` — Vite + React 19 + TypeScript (strict) + Tailwind v4 + Motion + Zustand.
- `apps/api` — (M2) Python FastAPI managed with `uv`. Never call model APIs from the browser; keys live server-side.

## Commands (repo root)
- `npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint` · `npm test` (Vitest) · `npm run e2e` (Playwright)

## Conventions
- Characters are **data**: `src/characters/<id>/` exports a `CharacterDef`. Shared rig animations live in `src/rig/animations.ts`; don't fork them per character unless overriding.
- Items attach to named rig sockets (`head`, `hand_l`, `hand_r`, `back`, `aura`). An `ItemDef` has a visual half (`Art`, `socket`) and a capability half (`capability`, consumed by the agent backend later).
- Per-frame movement writes transforms through refs in `useWanderLoop` — never put per-frame positions in React state or Zustand.
- Colors come from theme tokens in `src/theme/tokens.css`; no hard-coded hex in components (character palettes excepted).
- Respect `prefers-reduced-motion`.
- Pure logic (e.g. `world/wander.ts`) is unit-tested with Vitest; visuals are checked with Playwright screenshots in `apps/web/e2e`.
