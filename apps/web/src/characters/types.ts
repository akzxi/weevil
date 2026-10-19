import type { RigDef } from '../rig/types'
import type { Point } from '../world/wander'

export type StatKey = 'reasoning' | 'code' | 'speed' | 'context' | 'cost'

export interface SlotDef {
  kind: 'skill' | 'mcp'
}

export interface CharacterDef {
  id: string
  name: string
  company: string
  model: string
  palette: { primary: string; ink: string }
  rig: RigDef
  /** 0–100. For `cost`, higher means pricier. */
  stats: Record<StatKey, number>
  slots: SlotDef[]
  /** Item id per slot index, or null for an empty slot. Same length as `slots`. */
  equipped: (string | null)[]
  /** Where the character first appears, as a fraction of the roamable area. */
  spawn: Point
}
