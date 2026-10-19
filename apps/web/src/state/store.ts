import { create } from 'zustand'

interface WeevilState {
  /** Character currently zoomed into the select view, if any. */
  selectedId: string | null
  select: (id: string) => void
  deselect: () => void
}

export const useWeevil = create<WeevilState>()((set) => ({
  selectedId: null,
  select: (id) => set({ selectedId: id }),
  deselect: () => set({ selectedId: null }),
}))
