import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { characters, getCharacter } from '../characters/registry'
import { getItem } from '../items/registry'
import * as inv from './inventory'

/** An item being dragged. Pointer position is deliberately not stored (see DragLayer). */
export interface DragInfo {
  itemId: string
  source: 'shop' | 'grid' | 'worn'
  characterId?: string
}

interface WeevilState {
  /** Character currently zoomed into the select view, if any. */
  selectedId: string | null
  select: (id: string) => void
  deselect: () => void

  shopOpen: boolean
  setShopOpen: (open: boolean) => void

  drag: DragInfo | null
  setDrag: (drag: DragInfo | null) => void

  loadouts: Record<string, inv.Loadout>
  /** Returns false when the target grid is full. */
  equip: (characterId: string, itemId: string) => boolean
  unequip: (characterId: string, itemId: string) => void
  wear: (characterId: string, itemId: string) => void
  /** Returns false when the item's grid is full. */
  unwear: (characterId: string, itemId: string) => boolean
}

const starters = () => Object.fromEntries(characters.map((c) => [c.id, c.starter]))

/** A character's loadout, falling back to its starter (e.g. a character added after the save). */
export const loadoutOf = (loadouts: Record<string, inv.Loadout>, id: string): inv.Loadout =>
  loadouts[id] ?? getCharacter(id)?.starter ?? inv.emptyLoadout

export const useWeevil = create<WeevilState>()(
  persist(
    (set, get) => {
      /** Apply a pure inventory op; 'full' leaves state untouched and reports false. */
      const update = (characterId: string, op: (l: inv.Loadout) => inv.Loadout | 'full') => {
        const result = op(loadoutOf(get().loadouts, characterId))
        if (result === 'full') return false
        set({ loadouts: { ...get().loadouts, [characterId]: result } })
        return true
      }
      const withItem = (itemId: string, op: (l: inv.Loadout, item: NonNullable<ReturnType<typeof getItem>>) => inv.Loadout | 'full') =>
        (l: inv.Loadout) => {
          const item = getItem(itemId)
          return item ? op(l, item) : l
        }

      return {
        selectedId: null,
        select: (id) => set({ selectedId: id }),
        deselect: () => set({ selectedId: null }),

        shopOpen: false,
        setShopOpen: (shopOpen) => set({ shopOpen }),

        drag: null,
        setDrag: (drag) => set({ drag }),

        loadouts: starters(),
        equip: (c, id) => update(c, withItem(id, inv.equip)),
        unequip: (c, id) => void update(c, (l) => inv.unequip(l, id)),
        wear: (c, id) => void update(c, withItem(id, inv.wear)),
        unwear: (c, id) => update(c, withItem(id, inv.unwear)),
      }
    },
    {
      name: 'weevil:loadouts',
      version: 1,
      partialize: (s) => ({ loadouts: s.loadouts }),
    },
  ),
)
