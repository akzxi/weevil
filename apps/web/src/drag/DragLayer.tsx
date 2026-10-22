import { useEffect, useRef } from 'react'
import { getItem } from '../items/registry'
import { PixelIcon } from '../pixel/PixelArt'
import { useWeevil } from '../state/store'
import { applyDrop, pointer } from './drag'

const GHOST = 48

/** The item under the pointer while dragging. Follows the pointer via a ref, like useWanderLoop. */
export function DragLayer() {
  const drag = useWeevil((s) => s.drag)
  const setDrag = useWeevil((s) => s.setDrag)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!drag) return
    let active: Element | null = null
    const highlight = (el: Element | null) => {
      if (el === active) return
      active?.removeAttribute('data-drop-active')
      el?.setAttribute('data-drop-active', '')
      active = el
    }
    const place = () => {
      if (ref.current) ref.current.style.transform = `translate3d(${pointer.x - GHOST / 2}px, ${pointer.y - GHOST / 2}px, 0)`
      highlight(document.elementFromPoint(pointer.x, pointer.y)?.closest('[data-drop]') ?? null)
    }
    const move = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      place()
    }
    const end = (e: PointerEvent) => {
      highlight(null)
      if (e.type === 'pointerup') applyDrop(drag, e.clientX, e.clientY)
      setDrag(null)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      highlight(null)
      setDrag(null)
    }
    place()
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    window.addEventListener('keydown', key, true)
    return () => {
      highlight(null)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      window.removeEventListener('keydown', key, true)
    }
  }, [drag, setDrag])

  const item = drag ? getItem(drag.itemId) : undefined
  if (!item) return null
  return (
    <div
      ref={ref}
      data-testid="drag-ghost"
      className="pointer-events-none fixed top-0 left-0 z-50 cursor-grabbing drop-shadow-[3px_3px_0_rgb(0_0_0/0.35)]"
      style={{ width: GHOST, height: GHOST }}
    >
      <PixelIcon art={item.icon} className="size-full" />
    </div>
  )
}
