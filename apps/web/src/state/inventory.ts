import { getItem } from '../items/registry'
import { SOCKETS, type ItemDef, type Socket } from '../items/types'

/** Slots per Skills/MCPs grid (Minecraft-style 4×3). */
export const GRID_SIZE = 12

/** A character's items. Worn items have left their grid, like Minecraft armour. */
export interface Loadout {
  skills: string[]
  mcps: string[]
  worn: Partial<Record<Socket, string>>
}

export const emptyLoadout: Loadout = { skills: [], mcps: [], worn: {} }

/** Worn item defs, in socket order. */
export const wornItems = (l: Loadout): ItemDef[] =>
  SOCKETS.flatMap((s) => {
    const item = l.worn[s] ? getItem(l.worn[s]) : undefined
    return item ? [item] : []
  })

const gridOf = (item: ItemDef) => (item.kind === 'skill' ? 'skills' : 'mcps')

const has = (l: Loadout, id: string) =>
  l.skills.includes(id) || l.mcps.includes(id) || Object.values(l.worn).includes(id)

export function equip(l: Loadout, item: ItemDef): Loadout | 'full' {
  if (has(l, item.id)) return l
  const grid = gridOf(item)
  if (l[grid].length >= GRID_SIZE) return 'full'
  return { ...l, [grid]: [...l[grid], item.id] }
}

export function unequip(l: Loadout, id: string): Loadout {
  const worn = Object.fromEntries(Object.entries(l.worn).filter(([, v]) => v !== id))
  return { skills: l.skills.filter((s) => s !== id), mcps: l.mcps.filter((m) => m !== id), worn }
}

export function wear(l: Loadout, item: ItemDef): Loadout {
  const grid = gridOf(item)
  if (!l[grid].includes(item.id)) return l
  const prevId = l.worn[item.socket]
  const previous = prevId ? getItem(prevId) : undefined
  const next: Loadout = { ...l, [grid]: l[grid].filter((id) => id !== item.id), worn: { ...l.worn, [item.socket]: item.id } }
  if (!previous) return next
  // The displaced item returns to its own grid (a hand skill can displace a hand MCP).
  const prevGrid = gridOf(previous)
  if (next[prevGrid].length >= GRID_SIZE) return l
  return { ...next, [prevGrid]: [...next[prevGrid], previous.id] }
}

export function unwear(l: Loadout, item: ItemDef): Loadout | 'full' {
  const grid = gridOf(item)
  if (l.worn[item.socket] !== item.id) return l
  if (l[grid].length >= GRID_SIZE) return 'full'
  const worn = { ...l.worn }
  delete worn[item.socket]
  return { ...l, [grid]: [...l[grid], item.id], worn }
}
