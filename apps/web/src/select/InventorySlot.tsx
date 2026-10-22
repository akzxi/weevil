import type { KeyboardEvent, ReactNode } from 'react'
import { dragSource } from '../drag/drag'
import type { ItemDef } from '../items/types'
import { PixelIcon } from '../pixel/PixelArt'
import type { DragInfo } from '../state/store'

interface InventorySlotProps {
  item?: ItemDef
  /** Drag payload for a filled slot. */
  drag?: DragInfo
  /** Enter on a filled slot. */
  onActivate?: () => void
  /** Delete/Backspace on a filled slot. */
  onRemove?: () => void
  /** Click on an empty slot. */
  onEmptyClick?: () => void
  emptyLabel: string
  activateHint: string
  /** Shown faintly in an empty slot (e.g. a socket silhouette). */
  placeholder?: ReactNode
  dropProps?: Record<string, string>
}

/** One Minecraft-style inventory slot with a hover/focus tooltip. */
export function InventorySlot({ item, drag, onActivate, onRemove, onEmptyClick, emptyLabel, activateHint, placeholder, dropProps }: InventorySlotProps) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onActivate?.()
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      onRemove?.()
    }
  }

  return (
    <div className="mc-slot group relative size-11" {...dropProps}>
      {item ? (
        <button
          type="button"
          data-testid="slot-item"
          data-item={item.id}
          aria-label={`${item.name}. ${activateHint} Delete to remove, or drag it out.`}
          className="grid size-full cursor-grab touch-none place-items-center focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          onPointerDown={drag ? dragSource(() => drag) : undefined}
          onKeyDown={onKeyDown}
        >
          <PixelIcon art={item.icon} className="size-8" />
        </button>
      ) : (
        <button
          type="button"
          aria-label={emptyLabel}
          onClick={onEmptyClick}
          className="grid size-full place-items-center text-inv-ink opacity-30 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          {placeholder}
        </button>
      )}
      {item && (
        <div role="tooltip" className="mc-tooltip pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-52 -translate-x-1/2 group-focus-within:visible group-hover:visible">
          <div className="text-white">{item.name}</div>
          <div className="text-[0.8rem] leading-snug text-[#a8a8b8]">{item.description}</div>
        </div>
      )}
    </div>
  )
}
