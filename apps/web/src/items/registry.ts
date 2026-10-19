import type { ItemDef } from './types'
import { wizardHat } from './wizardHat'

const items: Record<string, ItemDef> = { [wizardHat.id]: wizardHat }

export const getItem = (id: string): ItemDef | undefined => items[id]

/** Resolve a character's equipped ids to item defs, skipping empty slots. */
export const resolveEquipped = (ids: (string | null)[]) =>
  ids.flatMap((id) => {
    const item = id ? getItem(id) : undefined
    return item ? [item] : []
  })
