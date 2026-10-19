import type { SlotDef } from '../characters/types'
import { getItem } from '../items/registry'

const KIND_LABEL: Record<SlotDef['kind'], string> = { skill: 'Skill', mcp: 'MCP' }

interface ItemSlotsProps {
  slots: SlotDef[]
  equipped: (string | null)[]
}

export function ItemSlots({ slots, equipped }: ItemSlotsProps) {
  return (
    <ul className="grid grid-cols-2 gap-2.5">
      {slots.map((slot, i) => {
        const item = equipped[i] ? getItem(equipped[i]) : undefined
        return (
          <li
            key={i}
            data-testid="item-slot"
            className={`flex min-h-16 items-center gap-3 rounded-xl border p-2.5 ${
              item ? 'border-panel-border bg-accent-soft' : 'border-dashed border-slot-border bg-slot'
            }`}
          >
            <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-panel">
              {item ? (
                <svg viewBox="-24 -38 48 46" className="size-9" aria-hidden>
                  <item.Art />
                </svg>
              ) : (
                <span className="text-lg text-ink-muted opacity-50">+</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[0.65rem] font-semibold tracking-wider text-ink-muted uppercase">
                {KIND_LABEL[slot.kind]}
              </div>
              <div className={`line-clamp-2 text-sm leading-tight ${item ? 'font-medium' : 'text-ink-muted'}`}>
                {item ? item.name : 'Empty'}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
