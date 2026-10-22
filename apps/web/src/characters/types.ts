import type { SpriteDef } from '../pixel/PixelSprite'
import type { Loadout } from '../state/inventory'
import type { Point } from '../world/wander'

export type StatKey = 'reasoning' | 'code' | 'speed' | 'context' | 'cost'

export interface CharacterDef {
  id: string
  name: string
  company: string
  model: string
  sprite: SpriteDef
  /** 0–100. For `cost`, higher means pricier. */
  stats: Record<StatKey, number>
  /** Loadout before the player changes anything. */
  starter: Loadout
  /** Where the character first appears, as a fraction of the roamable area. */
  spawn: Point
}
