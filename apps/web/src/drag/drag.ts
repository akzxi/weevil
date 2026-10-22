import type { PointerEvent as ReactPointerEvent } from 'react'
import { getItem } from '../items/registry'
import type { ItemDef } from '../items/types'
import { useWeevil, type DragInfo } from '../state/store'
import { isDrag } from '../world/wander'

/** Live pointer position during a drag; mutated directly, never stored in React state. */
export const pointer = { x: 0, y: 0 }

/** The `data-*` attributes of a drop target (`data-drop`, `data-character`, `data-kind`, `data-socket`). */
export type DropTarget = Partial<Record<'drop' | 'character' | 'kind' | 'socket', string>>

export type DropAction = { type: 'equip' | 'unequip' | 'wear' | 'unwear'; characterId: string } | null

/** Decide what a drop means. `inZone` = released over an inventory panel's background. */
export function dropAction(drag: DragInfo, target: DropTarget | null, inZone: boolean, item: ItemDef): DropAction {
  const own = drag.characterId
  if (!target?.character) {
    return drag.source !== 'shop' && !inZone && own ? { type: 'unequip', characterId: own } : null
  }
  const at = { characterId: target.character }
  const kindOk = target.drop !== 'grid' || target.kind === item.kind

  if (drag.source === 'shop') return target.drop !== 'worn' && kindOk ? { type: 'equip', ...at } : null
  if (target.character !== own) return null
  if (drag.source === 'grid' && target.drop === 'worn' && target.socket === item.socket) return { type: 'wear', ...at }
  if (drag.source === 'worn' && target.drop === 'grid' && kindOk) return { type: 'unwear', ...at }
  return null
}

/** Resolve the element under (x, y) and apply the drop to the store. */
export function applyDrop(drag: DragInfo, x: number, y: number) {
  const item = getItem(drag.itemId)
  if (!item) return
  const el = document.elementFromPoint(x, y)
  const target = el?.closest<HTMLElement>('[data-drop]')?.dataset ?? null
  const action = dropAction(drag, target, !!el?.closest('[data-drop-zone]'), item)
  if (action) useWeevil.getState()[action.type](action.characterId, item.id)
}

/**
 * Pointer handler that turns a press into an item drag once it travels past the
 * drag threshold, so a plain click on the same element still works.
 */
export function dragSource(getInfo: () => DragInfo, onStart?: () => void) {
  return (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    const x0 = e.clientX
    const y0 = e.clientY
    const move = (ev: PointerEvent) => {
      if (!isDrag(x0, y0, ev.clientX, ev.clientY)) return
      stop()
      pointer.x = ev.clientX
      pointer.y = ev.clientY
      useWeevil.getState().setDrag(getInfo())
      onStart?.()
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }
}
