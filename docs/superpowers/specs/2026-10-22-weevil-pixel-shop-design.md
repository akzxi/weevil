# weevil — M1.5: Pixel Clawd, thought bubble, inventories, shop & item drag-drop

## Context
Before Milestone 2 (chat backend), you want Clawd to become 8-bit pixel art that moves like a Space Invader: frames swap and he marches in steps, with no pivoting rig parts. Items become pixel art too. The speech bubble becomes a thought bubble. The single "Equipped" section splits into Minecraft-style Skills and MCPs inventories (4×3 each), plus a 1×4 worn column (head/hand/back/feet) to the left of the character. A shop on the main page lists real skills and MCP servers. You drag an item onto a character (in the world, or onto the select-screen grid) to equip it, and drag it out of the inventory to remove it. Loadouts persist in localStorage for now and move server-side with the API later.

### Decisions from the interview
| Topic | Decision |
|---|---|
| Movement | Stepped march: hops in whole sprite-pixel steps, swapping 2 walk frames on every hop, so legs and steps stay in sync |
| Catalog | ~10 real Claude skills + ~10 real MCP servers, each with a short description and an 8×8 pixel icon |
| Worn items | Every item has a socket: `head` / `hand` / `back` / `feet`. A 1×4 worn column sits left of the character; worn items are drawn on Clawd |
| Wear rule | **Moves like Minecraft armor**: dragging grid→worn moves the item out of the grid. If the socket is occupied, the two items swap. Dragging worn→grid moves it back |
| Shop drops | Onto a wandering character, or onto the select-screen Skills/MCPs grid (the shop also opens while a character is selected) |
| Persistence | Zustand `persist` → localStorage (key `weevil:loadouts`); server-side later |

## Design

### Pixel art (replaces the vector rig)
- `src/pixel/PixelArt.tsx`: renders `{ rows: string[]; palette: Record<string, string> }` (`.` means transparent) as SVG `<rect>`s, merging horizontal runs and using `shape-rendering="crispEdges"`.
- `src/pixel/PixelSprite.tsx`: draws a sprite's current frame plus worn item icons at socket anchors. Frames advance on their own `ms` timers, except walk, where the frame comes from the wander step counter (`step % 2`). Under reduced motion it holds frame 0.
- `CharacterDef.rig` → `sprite: { width, height, frames: Record<SpriteMode, { rows; ms }[]>, palette, sockets: Record<Socket, Point> }`. Clawd becomes a ~24×18 grid with these frames:
  - idle: 2 (open eyes / blink)
  - walk: 2 (legs splayed / legs tucked, arms up / down)
  - held: 2 (legs kicking, wide eyes)
  - land: 1 (squash)
  - selected: 2 (arms up, happy eyes)
- The static `slots` and `equipped` fields are removed from `CharacterDef`; loadouts move to the store.
- **Ruling:** delete `src/rig/` (Rig, animations, types, test) and `ClawdParts.tsx`. Clawd was the only rig user, and the code stays recoverable from commit `6858f32` if a future non-pixel logo needs it.

### Stepped wander (`world/wander.ts`)
- Config: `speed` → `stepSize` (px, e.g. 8 = 2 sprite pixels) + `stepRate` (hops/s, e.g. 6).
- State gains `stepTimer` and `step`. While walking, each time the timer elapses the sprite hops `min(stepSize, dist)` toward its target and `step++`. Positions snap to whole px.
- Drag and drop logic is unchanged. Sprite reports `step` changes to React (about 6 re-renders/s while walking, which is fine).

### Items & catalog
- `ItemDef`: `{ id, name, kind: 'skill' | 'mcp', description (≤ ~60 chars), socket: 'head' | 'hand' | 'back' | 'feet', icon: PixelArt, capability: { type, ref } }`. The `cosmetic` kind is dropped as unused.
- `src/items/catalog.ts`:
  - Skills: frontend-design (wizard hat, head), pdf, docx, xlsx, pptx, webapp-testing, mcp-builder, skill-creator, canvas-design, brand-guidelines.
  - MCPs: GitHub, Playwright, Context7, Slack, Filesystem, Postgres, Sentry, Notion, Linear, Brave Search.
  - Each gets a hand-drawn 8×8 icon and a sensible socket. The registry reads from the catalog; `wizardHat.tsx` is deleted.

### Loadout state (`src/state/inventory.ts`, pure and unit-tested)
`Loadout = { skills: string[]; mcps: string[]; worn: Partial<Record<Socket, string>> }`, at most 12 per grid.
- `equip`: append to the matching grid; no-op if the item is already in a grid or worn; returns `'full'` at 12.
- `unequip`: remove from grid or worn.
- `wear`: move from grid to `worn[item.socket]`, swapping out any current occupant.
- `unwear`: move back to the grid, or `'full'` if the grid has no room.

The store (`state/store.ts`) adds `loadouts` (persisted) and actions wrapping these functions. Default loadout: Clawd wears frontend-design on his head with empty grids.

### Drag system (one for all three sources; no new dependency)
- Store holds only `drag: { itemId; source: 'shop' | 'grid' | 'worn'; characterId? } | null`. The pointer position never goes into state: `src/drag/DragLayer.tsx` moves a fixed ghost icon via a ref on `pointermove`. This mirrors `useWanderLoop`.
- On drop, `elementFromPoint` + `closest('[data-drop]')` resolves the target:
  - `character` (world sprite or select-stage Clawd), or the matching `grid`: equip
  - `worn` slot of the item's socket: wear (wrong socket = reject)
  - grid, from a worn slot: unwear
  - `[data-drop-zone="inventory"]` panel background: cancel
  - anywhere else, for grid/worn items: remove. Shop drags onto nothing just cancel.
- The target under the ghost gets `data-drop-active` for a highlight ring. Dragging from the shop closes it on drag start (6px threshold, same `isDrag` as sprites).
- **Keyboard fallback (accessibility):**
  - Shop row: an "Equip" button that adds the item to the selected character, or Clawd if none is selected. `shortcut:` comment noting this needs a character picker once there are several characters.
  - Grid item: Enter = wear, Delete = remove.
  - Worn item: Enter = unwear, Delete = remove.

### UI
- **Thought bubble** (`select/ThoughtBubble.tsx` replaces `SpeechBubble`): a pixel cloud with two trailing puffs toward Clawd and the animated dots inside. Same no-op button.
- **Select view layout** (desktop): `[worn 1×4][Clawd stage][stats panel]` on the first row, then the `[Skills 4×3][MCPs 4×3]` panels below. On mobile it's a scrollable sheet with the worn column still beside the stage. `SelectPanel` keeps the header and stats. New `InventoryGrid.tsx` (replaces `ItemSlots`) and `WornColumn.tsx`, with empty worn slots showing a faint socket silhouette.
- **Minecraft styling:** grey bevelled panel, inset slots with light/dark bevel borders and pixel-font titles (Silkscreen from Google Fonts). New theme tokens (`--inv-bg`, `--inv-slot`, `--inv-hi`, `--inv-lo`) with dark variants. Hover/focus shows a Minecraft-style tooltip with the item name and description.
- **Shop:** a "Shop" button (pixel icon) beside the theme toggle. The button group sits above the select backdrop so the shop is reachable from both screens. It opens a side panel (bottom sheet on mobile) with a search box (filters name and description), a scrollable list grouped into Skills / MCPs, and rows showing icon, name, short description, and an Equip button. Esc or the backdrop closes it.

### Docs
CLAUDE.md conventions get updated: pixel sprites/frames replace the rig, items are pixel `icon`s with a socket, loadouts live in the store, and the drag ghost moves through refs. The approved plan is copied to `docs/superpowers/specs/2026-10-22-weevil-pixel-shop-design.md`.

## Implementation steps (branch `m1.5-pixel-shop`, TDD for logic)
1. Commit the spec doc; create the branch; check zustand v5 `persist` docs via Context7.
2. `PixelArt` + test → catalog + data-validity test (unique ids, consistent row widths, all palette chars defined, ≥10 per kind).
3. `inventory.ts` tests first → implement → persisted store slice.
4. `wander.ts` stepping: update tests first (no move before a step elapses; moves exactly `stepSize`; `step` increments; arrives without overshoot).
5. Clawd pixel frames + `PixelSprite`; swap Sprite/SelectView over; delete rig, ClawdParts, wizardHat.
6. ThoughtBubble.
7. InventoryGrid + WornColumn + new select layout + Minecraft tokens/font (load the frontend-design skill for this UI pass).
8. Drag system + DragLayer + drop targets + keyboard fallbacks.
9. Shop button + panel.
10. Update the SelectPanel unit test and e2e. New e2e checks:
    - drag shop → world Clawd → item appears in his Skills grid
    - drag grid → head slot → worn (and drawn on Clawd)
    - drag out → removed
    - reload → loadout persists
    - shop search filters
    - thought bubble visible
    Regenerate screenshot baselines.
11. Self-review / `/simplify`, then merge after your OK.

## Verification
- `npm run typecheck && npm run lint && npm test && npm run build` pass.
- `npm run e2e` passes on desktop and mobile, run twice for flakiness.
- Playwright MCP: look at the world (march frames mid-walk), select screen, shop open, and a drag in progress, in light and dark; check the Minecraft grids at 1440×900 and 390×844.

## Out of scope (named, not built)
- Positional slots (items fill grids in order).
- A drop "celebration" animation.
- Per-character catalogs.
- Server persistence (M2+).
