import type { Transition, Variants } from 'motion/react'
import type { PartRole } from './types'

/**
 * Shared rig animations, keyed by part role then rig mode. Every variant resets
 * the properties other modes touch so switching modes never leaves a part stuck
 * mid-pose. Function variants receive the part's `phase` (0 | 1) as `custom`.
 */

const loop = (duration: number, extra: Transition = {}): Transition => ({
  duration,
  repeat: Infinity,
  ease: 'easeInOut',
  ...extra,
})

const WALK = 0.4
const CHEER = { duration: 1.4, repeat: Infinity, repeatDelay: 0.6 }

const blink = {
  scaleX: 1,
  scaleY: [1, 1, 0.1, 1, 1],
  transition: { duration: 4, repeat: Infinity, times: [0, 0.9, 0.93, 0.96, 1] },
}

/** Alternating swing keyframes; phase 1 runs opposite to phase 0. */
const swing = (deg: number, phase: number) => (phase ? [deg, -deg, deg] : [-deg, deg, -deg])

export const rigVariants: Record<PartRole, Variants> = {
  body: {
    idle: { y: [0, -1.5, 0], rotate: 0, scaleX: 1, scaleY: [1, 1.03, 1], transition: loop(2.4) },
    walk: { y: [0, -3, 0], rotate: [-2, 2, -2], scaleX: 1, scaleY: 1, transition: loop(WALK) },
    held: {
      y: 0,
      rotate: [-7, 7, -7],
      scaleX: 0.97,
      scaleY: 1.04,
      transition: { rotate: loop(0.9) },
    },
    land: {
      y: 0,
      rotate: 0,
      scaleX: [1.22, 0.96, 1],
      scaleY: [0.72, 1.08, 1],
      transition: { duration: 0.4, ease: 'easeOut' },
    },
    selected: {
      y: [0, 0, -10, 0],
      rotate: 0,
      scaleX: 1,
      scaleY: [1, 0.9, 1.06, 1],
      transition: { ...CHEER, times: [0, 0.15, 0.45, 0.75] },
    },
  },
  leg: {
    idle: { rotate: 0 },
    walk: (phase: number) => ({ rotate: swing(18, phase), transition: loop(WALK) }),
    held: (phase: number) => ({ rotate: swing(26, phase), transition: loop(0.22) }),
    land: { rotate: 0 },
    selected: { rotate: 0 },
  },
  eye: {
    idle: blink,
    walk: blink,
    held: { scaleX: 1.15, scaleY: 1.3 },
    land: { scaleX: 1, scaleY: [0.3, 1], transition: { duration: 0.4 } },
    selected: { scaleX: 1.1, scaleY: 0.35 },
  },
  arm: {
    idle: { rotate: 0, y: 0 },
    walk: (phase: number) => ({ rotate: 0, y: swing(1, phase), transition: loop(WALK) }),
    // Left arm pivots on its right edge, right arm on its left: mirror the angle.
    held: (phase: number) => ({ y: 0, rotate: swing(phase ? -28 : 28, phase), transition: loop(0.3) }),
    land: { rotate: 0, y: 0 },
    selected: (phase: number) => ({
      y: 0,
      rotate: phase ? [0, -35, 0] : [0, 35, 0],
      transition: { ...CHEER, times: [0, 0.45, 0.75] },
    }),
  },
}
