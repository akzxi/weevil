import type { PixelArt } from '../pixel/PixelArt'

export type ItemKind = 'skill' | 'mcp'

/** Where a worn item is drawn on a character. Order = worn column order. */
export const SOCKETS = ['head', 'hand', 'back', 'feet'] as const
export type Socket = (typeof SOCKETS)[number]

/**
 * An equippable item. The visual half is an 8×8 pixel icon worn on a socket;
 * the capability half is what the agent backend will load when equipped (M3).
 */
export interface ItemDef {
  id: string
  name: string
  kind: ItemKind
  /** Shown in the shop and tooltips; keep it under ~60 chars. */
  description: string
  socket: Socket
  icon: PixelArt
  capability: { type: ItemKind; ref: string }
}
