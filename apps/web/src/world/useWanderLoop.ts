import { useEffect } from 'react'
import { step, type Bounds, type Facing, type WanderConfig, type WanderMode, type WanderState } from './wander'

/** Live, mutable per-sprite record. The loop and pointer handlers write to it directly. */
export interface SpriteEntry {
  el: HTMLElement
  state: WanderState
  config: WanderConfig
  paused: boolean
  /** Last mode/facing reported to React, so it only re-renders on change. */
  reported: { mode: WanderMode; facing: Facing }
  onChange: (mode: WanderMode, facing: Facing) => void
}

export type SpriteRegistry = Map<string, SpriteEntry>

export const viewportBounds = (): Bounds => ({ width: window.innerWidth, height: window.innerHeight })

export function applyEntry(entry: SpriteEntry) {
  const { x, y, mode, facing } = entry.state
  entry.el.style.transform = `translate3d(${x}px, ${y}px, 0)`
  // Lower on screen draws in front; held sprites float above everything.
  entry.el.style.zIndex = mode === 'held' ? '10' : '1'
  if (mode !== entry.reported.mode || facing !== entry.reported.facing) {
    entry.reported = { mode, facing }
    entry.onChange(mode, facing)
  }
}

/**
 * One requestAnimationFrame loop for every sprite. Positions are written
 * straight to the DOM; React only hears about mode/facing changes.
 */
export function useWanderLoop(registry: SpriteRegistry) {
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      // Clamp dt so a backgrounded tab doesn't teleport sprites on return.
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const bounds = viewportBounds()
      for (const entry of registry.values()) {
        if (!entry.paused) entry.state = step(entry.state, dt, bounds, entry.config, Math.random)
        applyEntry(entry)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [registry])
}
