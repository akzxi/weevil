# weevil

A little world of AI model characters. Sprites based on different AI companies and models wander around the screen. Drag them around like Miis, or click one to zoom it into a game-style character-select view with stats and equipped items.

Milestone 1 ships **Clawd** (Claude). Next up: chatting with each character through a Python backend, and equippable skills/MCP servers that give its agent real capabilities. See [`docs/superpowers/specs`](docs/superpowers/specs).

## Stack

- **Web** (`apps/web`): Vite, React 19, TypeScript, Tailwind CSS v4, Motion, Zustand
- **API** (`apps/api`, coming in M2): Python, FastAPI, Anthropic SDK / Claude Agent SDK

Characters are data: a vector **rig** (parts + named sockets) shared across characters, so walk/idle/held/select animations come for free, and items attach to sockets and follow every animation.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run e2e        # end-to-end + screenshot tests (Playwright)
npm run typecheck && npm run lint
```

First e2e run: `npx playwright install chromium` in `apps/web`. Screenshot baselines are per-OS; regenerate with `npx playwright test --update-snapshots` from `apps/web`.

---

weevil is an independent fan project and is not affiliated with or endorsed by Anthropic or any other company shown. Character designs reference their respective owners' marks.
