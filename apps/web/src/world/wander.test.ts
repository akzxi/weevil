import { describe, expect, it } from 'vitest'
import {
  DRAG_THRESHOLD,
  createWanderState,
  grab,
  isDrag,
  moveHeld,
  release,
  step,
  type WanderConfig,
} from './wander'

const bounds = { width: 1000, height: 800 }
const config: WanderConfig = {
  size: { width: 100, height: 80 },
  speed: 100,
  idle: [1, 2],
  landDuration: 0.4,
  canWalk: true,
}

/** Deterministic rng returning the given values in order (then repeating the last). */
const seq = (...values: number[]) => {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

describe('createWanderState', () => {
  it('spawns idle at the spawn fraction, clamped into bounds', () => {
    const s = createWanderState({ x: 0.5, y: 0.5 }, bounds, config)
    expect(s).toMatchObject({ x: 450, y: 360, mode: 'idle', facing: 1 })
    const edge = createWanderState({ x: 1, y: 1 }, bounds, config)
    expect(edge).toMatchObject({ x: 900, y: 720 })
  })
})

describe('step', () => {
  it('stays idle until the idle timer runs out, then walks toward a random target', () => {
    const s = { ...createWanderState({ x: 0.5, y: 0.5 }, bounds, config), timer: 1 }
    const still = step(s, 0.5, bounds, config, seq(0))
    expect(still.mode).toBe('idle')
    const walking = step(still, 0.6, bounds, config, seq(0.1, 0.2))
    expect(walking.mode).toBe('walk')
    expect(walking.target).toEqual({ x: 90, y: 144 })
    expect(walking.facing).toBe(-1)
  })

  it('moves toward the target at configured speed and faces the direction of travel', () => {
    const s = { ...createWanderState({ x: 0, y: 0 }, bounds, config), mode: 'walk' as const, target: { x: 500, y: 0 } }
    const next = step(s, 1, bounds, config, seq(0))
    expect(next.x).toBeCloseTo(100)
    expect(next.y).toBeCloseTo(0)
    expect(next.facing).toBe(1)
  })

  it('arrives exactly on the target and starts idling for a random duration', () => {
    const s = { ...createWanderState({ x: 0, y: 0 }, bounds, config), mode: 'walk' as const, target: { x: 50, y: 0 } }
    const next = step(s, 1, bounds, config, seq(0.5))
    expect(next).toMatchObject({ x: 50, y: 0, mode: 'idle', target: null, timer: 1.5 })
  })

  it('never walks when canWalk is false (reduced motion)', () => {
    const s = { ...createWanderState({ x: 0.5, y: 0.5 }, bounds, config), timer: 0.1 }
    const next = step(s, 1, bounds, { ...config, canWalk: false }, seq(0.3))
    expect(next.mode).toBe('idle')
    expect(next.x).toBe(s.x)
  })

  it('keeps the sprite inside bounds when the viewport shrinks', () => {
    const s = { ...createWanderState({ x: 1, y: 1 }, bounds, config), timer: 5 }
    const next = step(s, 0.016, { width: 400, height: 300 }, config, seq(0))
    expect(next.x).toBe(300)
    expect(next.y).toBe(220)
  })

  it('does nothing while held', () => {
    const s = grab(createWanderState({ x: 0.5, y: 0.5 }, bounds, config), 460, 370)
    expect(step(s, 1, bounds, config, seq(0))).toBe(s)
  })

  it('finishes landing, then idles', () => {
    const s = release(grab(createWanderState({ x: 0, y: 0 }, bounds, config), 10, 10), bounds, config)
    const mid = step(s, 0.2, bounds, config, seq(0))
    expect(mid.mode).toBe('land')
    const done = step(mid, 0.3, bounds, config, seq(0))
    expect(done.mode).toBe('idle')
  })
})

describe('drag & drop', () => {
  it('treats movement beyond the threshold as a drag', () => {
    expect(isDrag(0, 0, DRAG_THRESHOLD - 1, 0)).toBe(false)
    expect(isDrag(0, 0, DRAG_THRESHOLD, DRAG_THRESHOLD)).toBe(true)
  })

  it('keeps the grab offset so the sprite does not jump to the pointer', () => {
    const s = grab(createWanderState({ x: 0, y: 0 }, bounds, config), 30, 20)
    expect(s.mode).toBe('held')
    const moved = moveHeld(s, 230, 120)
    expect(moved).toMatchObject({ x: 200, y: 100, facing: 1 })
    expect(moveHeld(moved, 130, 120).facing).toBe(-1)
  })

  it('clamps into bounds on release and starts landing', () => {
    const held = moveHeld(grab(createWanderState({ x: 0, y: 0 }, bounds, config), 0, 0), 5000, -50)
    const dropped = release(held, bounds, config)
    expect(dropped).toMatchObject({ x: 900, y: 0, mode: 'land', timer: 0.4, target: null })
  })
})
