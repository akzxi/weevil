/**
 * Pure wandering + drag/drop state machine for a sprite. Positions are the
 * top-left of the sprite box in viewport pixels. No DOM, no time source:
 * callers pass dt and an rng so this is fully deterministic under test.
 */

export type WanderMode = 'idle' | 'walk' | 'held' | 'land'
export type Facing = 1 | -1

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  width: number
  height: number
}

export interface WanderConfig {
  size: { width: number; height: number }
  /** Walk speed in px/s. */
  speed: number
  /** Idle pause range in seconds [min, max]. */
  idle: [number, number]
  /** Seconds the landing squash lasts after a drop. */
  landDuration: number
  /** False under reduced motion: sprites idle in place. */
  canWalk: boolean
}

export interface WanderState extends Point {
  mode: WanderMode
  facing: Facing
  target: Point | null
  /** Seconds left in the current idle or land phase. */
  timer: number
  /** Pointer position relative to the sprite while held. */
  grabOffset: Point
}

export type Rng = () => number

/** Pointer travel (px) after which a press becomes a drag instead of a click. */
export const DRAG_THRESHOLD = 6

const maxX = (b: Bounds, c: WanderConfig) => Math.max(0, b.width - c.size.width)
const maxY = (b: Bounds, c: WanderConfig) => Math.max(0, b.height - c.size.height)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function clampInto<T extends Point>(s: T, b: Bounds, c: WanderConfig): T {
  const x = clamp(s.x, 0, maxX(b, c))
  const y = clamp(s.y, 0, maxY(b, c))
  return x === s.x && y === s.y ? s : { ...s, x, y }
}

const idleFor = (c: WanderConfig, rng: Rng) => c.idle[0] + (c.idle[1] - c.idle[0]) * rng()

export function createWanderState(spawn: Point, b: Bounds, c: WanderConfig): WanderState {
  return {
    x: spawn.x * maxX(b, c),
    y: spawn.y * maxY(b, c),
    mode: 'idle',
    facing: 1,
    target: null,
    timer: c.idle[0],
    grabOffset: { x: 0, y: 0 },
  }
}

export function step(s: WanderState, dt: number, b: Bounds, c: WanderConfig, rng: Rng): WanderState {
  if (s.mode === 'held') return s
  const cur = clampInto(s, b, c)

  switch (cur.mode) {
    case 'land':
    case 'idle': {
      const timer = cur.timer - dt
      if (timer > 0) return { ...cur, timer }
      if (cur.mode === 'land' || !c.canWalk) {
        return { ...cur, mode: 'idle', timer: idleFor(c, rng) }
      }
      const target = { x: rng() * maxX(b, c), y: rng() * maxY(b, c) }
      return { ...cur, mode: 'walk', target, timer: 0, facing: target.x < cur.x ? -1 : 1 }
    }
    case 'walk': {
      const target = cur.target ? clampInto(cur.target, b, c) : cur
      const dx = target.x - cur.x
      const dy = target.y - cur.y
      const dist = Math.hypot(dx, dy)
      const travel = c.speed * dt
      if (!c.canWalk || dist <= travel) {
        return { ...cur, x: target.x, y: target.y, mode: 'idle', target: null, timer: idleFor(c, rng) }
      }
      const facing: Facing = dx === 0 ? cur.facing : dx < 0 ? -1 : 1
      return { ...cur, x: cur.x + (dx / dist) * travel, y: cur.y + (dy / dist) * travel, target, facing }
    }
  }
}

export const isDrag = (x0: number, y0: number, x1: number, y1: number) =>
  Math.hypot(x1 - x0, y1 - y0) >= DRAG_THRESHOLD

export function grab(s: WanderState, px: number, py: number): WanderState {
  return { ...s, mode: 'held', target: null, grabOffset: { x: px - s.x, y: py - s.y } }
}

export function moveHeld(s: WanderState, px: number, py: number): WanderState {
  const x = px - s.grabOffset.x
  const y = py - s.grabOffset.y
  const facing: Facing = x === s.x ? s.facing : x < s.x ? -1 : 1
  return { ...s, x, y, facing }
}

export function release(s: WanderState, b: Bounds, c: WanderConfig): WanderState {
  return clampInto({ ...s, mode: 'land', timer: c.landDuration, target: null }, b, c)
}
