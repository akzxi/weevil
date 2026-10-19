import type { ComponentType } from 'react'

/** Every rig exposes these attachment points; items pick one. */
export type SocketName = 'head' | 'hand_l' | 'hand_r' | 'back' | 'aura'

/**
 * Shared animations target parts by role, so any character built from these
 * roles gets idle/walk/held/land/selected for free.
 */
export type PartRole = 'body' | 'leg' | 'eye' | 'arm'

/** Animation state a rig can be in. Mirrors the wander modes plus `selected`. */
export type RigMode = 'idle' | 'walk' | 'held' | 'land' | 'selected'

export interface PartDef {
  id: string
  role: PartRole
  /** Child parts render inside their parent's group and inherit its motion. */
  parent?: string
  /** Paint order among siblings (lower first). */
  layer: number
  /** Transform origin in rig (viewBox) units. */
  pivot: { x: number; y: number }
  /** Walk-cycle phase for legs/arms (0 or 1); passed as Motion `custom`. */
  phase?: number
  Art: ComponentType
}

export interface SocketDef {
  /** Part the socket rides on; items follow that part's animation. */
  part: string
  x: number
  y: number
}

export interface RigDef {
  viewBox: { width: number; height: number }
  parts: PartDef[]
  sockets: Record<SocketName, SocketDef>
}
