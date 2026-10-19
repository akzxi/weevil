# weevil — Milestone 1: Clawd wanders, gets selected

## Context
weevil is a portfolio/showcase web app: animated sprites, each representing an AI company/model, roam the screen. Clicking one zooms it to center-stage in a game-style character-select view. Later, each character becomes a chat wrapper for its model, and **equipped items = real agent capabilities (skills, MCP servers)**, plus evolutions/power-ups/alternate skins.

Repo is empty (`main`, no commits). This milestone builds the foundation and the first character (Clawd, the Claude Code mascot). No backend yet.

### Decisions from the interview
| Topic | Decision |
|---|---|
| Platform | Web app in browser, desktop-first, mobile works (tap, responsive panel) |
| Sprite tech | Code-driven **vector SVG rig** (parts + named sockets), animated with Motion — scales to non-pixel logos, items attach to sockets and follow every animation |
| Scene | Free roam across full screen |
| Select view | Dim + blur backdrop **and** character-select panel |
| Panel content | Name · company · model; stat bars (Reasoning, Code, Speed, Context, Cost); equipped-item slots |
| Items | 4 slots (2 Skill, 2 MCP) + 1 visual demo item rendered on a socket. Schema has visual + (future) capability halves |
| Theme | Light (cream/terracotta) + dark (cozy night), toggle, defaults to system |
| Frontend | Vite + React 19 + TypeScript (strict) + Tailwind v4 + Motion + Zustand |
| Backend (M2, not now) | Python FastAPI + `uv` (RAG/LangGraph/Claude Agent SDK ecosystem), SSE streaming to web |
| API key policy | Deferred to M2 |

## Architecture

```
weevil/
  package.json            # npm workspaces (pnpm not installed; npm 10 is)
  CLAUDE.md               # conventions for future sessions
  docs/superpowers/specs/2026-10-19-weevil-m1-design.md   # this spec, committed
  apps/web/
    src/
      main.tsx, App.tsx
      theme/      tokens.css (Tailwind v4 @theme + CSS vars, light/dark), useTheme.ts, ThemeToggle.tsx
      rig/        types.ts (Part, Socket, RigDef), Rig.tsx (renders parts by layer, sockets as <g> frames), animations.ts (shared idle/walk/selected variants)
      characters/ types.ts (CharacterDef), registry.ts, clawd/{clawd.ts, ClawdParts.tsx}
      items/      types.ts (ItemDef), registry.ts, wizardHat.tsx (demo "Skill" item on `head` socket)
      world/      wander.ts (pure steering logic), useWanderLoop.ts (single rAF loop, writes transforms via refs — no per-frame React renders), World.tsx, Sprite.tsx
      select/     SelectView.tsx (backdrop + center stage), SelectPanel.tsx, StatBar.tsx, ItemSlots.tsx, SpeechBubble.tsx
      state/      store.ts (Zustand: selectedId, theme)
    e2e/          select.spec.ts (Playwright + toHaveScreenshot)
  apps/api/               # created in M2
```

### Data model (the long-term backbone)
- **CharacterDef**: `id, name, company, model, palette, rig: RigDef, stats: {reasoning, code, speed, context, cost} (0–100; cost shown as "$" where lower is better), slots: SlotDef[] ({kind:'skill'|'mcp'}), equipped: ItemId[], variants?` (future evolutions/skins = alternate part sets).
- **RigDef**: parts (`id, svg component, pivot, layer, parent?`) + sockets (`head, hand_l, hand_r, back, aura`) as coordinate frames inside the rig. Animations target part ids, so every character with the shared rig gets walk/idle/select for free; per-character overrides allowed.
- **ItemDef**: `id, name, kind:'skill'|'mcp'|'cosmetic', socket, Art component, capability?: {type:'skill'|'mcp', ref}` — capability unused in M1, consumed by the Python agent in M3.

### Behavior
- **Wander**: pick random target in viewport bounds → walk at speed (facing flips by direction) → idle pause → repeat. Resize-aware. Pure function `step(state, dt, bounds, rng)` → unit-tested with seeded RNG.
- **Select**: sprite is a `<button>` (click/tap/Enter). Wander pauses; Motion `layoutId` shared transition moves Clawd from its world position to center at ~3.5× scale; backdrop dims + `backdrop-blur`; panel slides in (right side ≥md, bottom sheet on mobile) with staggered stat-bar fills; Clawd plays "selected" animation (hop + happy eyes).
- **Speech bubble**: pops (spring) at top-right of zoomed Clawd; focusable button, no-op, tooltip "Chat — coming soon". Hook point for M2.
- **Exit**: Esc, backdrop click, close button → reverse transition, wander resumes from new position.
- **A11y**: select view is `role="dialog"` with focus trap + return focus; `prefers-reduced-motion` → sprites idle in place, crossfade instead of zoom.
- Clawd art: rect-based SVG in Claude orange (`#D97757`), eye blocks, arm nubs, 4 legs as separate parts for the walk cycle.
- README footer: fan project, not affiliated with Anthropic or other companies; logos belong to their owners.

## Implementation steps (TDD for logic, Playwright for visuals)
1. Commit this spec to `docs/superpowers/specs/` + `CLAUDE.md`; `.gitignore`; npm workspaces root.
2. Scaffold `apps/web` (Vite React TS), Tailwind v4 via `@tailwindcss/vite`, Motion, Zustand, Vitest + Testing Library, Playwright, ESLint/Prettier. Check current setup docs (Context7 / WebFetch) before installing; pin versions.
3. Theme tokens + toggle (test: persists, respects system).
4. Rig types + `Rig.tsx` + socket rendering (test: item renders inside its socket group).
5. Clawd character def + parts; shared idle/walk/selected animations.
6. `wander.ts` (tests first: bounds, facing, idle transitions) → `useWanderLoop` → `World`/`Sprite`.
7. Select view: backdrop, shared-element zoom, panel (header, StatBar ×5, ItemSlots with wizard-hat demo item), SpeechBubble, exit paths, focus trap.
8. Reduced-motion + mobile layout.
9. Playwright e2e + screenshot baselines (desktop 1440×900, mobile 390×844, light + dark).
10. `superpowers:requesting-code-review` / `/simplify`, then finish branch.

## Verification
- `npm run typecheck && npm run lint && npm test` (Vitest) pass.
- `npx playwright test` — selects Clawd, asserts dialog, panel contents (name/company/model, 5 stat bars, 4 slots incl. demo item), bubble visible, Esc closes and wander resumes; screenshot comparisons in both themes and viewports.
- Live visual review during build via Playwright MCP: `npm run dev`, screenshot wander / mid-transition / selected, iterate on design.

## Recommended tooling (install before implementation)
- **Playwright MCP** (not installed): `claude mcp add playwright -- npx @playwright/mcp@latest` — lets me drive the app and see screenshots as we build.
- **Context7 MCP** for current library docs (Vite, Tailwind v4, Motion, React 19, FastAPI): `claude mcp add --transport http context7 https://mcp.context7.com/mcp`.
- **frontend-design plugin** (Anthropic official, for distinctive UI design): `/plugin install frontend-design@claude-plugins-official`.
- Already available and will be used: superpowers (TDD, writing-plans, subagent-driven-development, verification), `run`, `code-review`, `simplify`; `claude-api` skill + `security-review` at M2 (Claude SDK + key handling).
- GitHub MCP is failing auth (HTTP 400) — re-auth if you want PRs/issues from here.

## Roadmap (separate specs later)
- **M2** — `apps/api` FastAPI + `anthropic` SDK, SSE chat from the speech bubble; decide key policy.
- **M3** — Equipping items wires real capabilities via Claude Agent SDK (Python): skills + MCP servers per character.
- **M4** — More characters (other companies), evolutions/power-ups/alt skins as rig variants; consider PixiJS renderer if sprite/particle count grows.
