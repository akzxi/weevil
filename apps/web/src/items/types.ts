import type { ComponentType } from 'react'
import type { SocketName } from '../rig/types'

export type ItemKind = 'skill' | 'mcp' | 'cosmetic'

/**
 * An equippable item. The visual half renders on a rig socket; the capability
 * half is what the agent backend will load when the item is equipped (M3).
 */
export interface ItemDef {
  id: string
  name: string
  kind: ItemKind
  description: string
  socket: SocketName
  /** Drawn in rig units around the socket origin (0,0). */
  Art: ComponentType
  capability?: { type: 'skill' | 'mcp'; ref: string }
}
