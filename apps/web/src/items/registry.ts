import { catalog } from './catalog'
import type { ItemDef } from './types'

const items = new Map(catalog.map((i) => [i.id, i]))

export const getItem = (id: string): ItemDef | undefined => items.get(id)
