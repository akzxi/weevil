import { getItem } from '../items/registry'
import type { ItemKind } from '../items/types'
import { GRID_SIZE } from '../state/inventory'
import { loadoutOf, useWeevil } from '../state/store'
import { InventorySlot } from './InventorySlot'

const TITLE: Record<ItemKind, string> = { skill: 'Skills', mcp: 'MCPs' }

/** A 4×3 Minecraft-style grid of a character's skills or MCP servers. */
export function InventoryGrid({ characterId, kind }: { characterId: string; kind: ItemKind }) {
  const ids = useWeevil((s) => loadoutOf(s.loadouts, characterId)[kind === 'skill' ? 'skills' : 'mcps'])
  const { wear, unequip, setShopOpen } = useWeevil.getState()
  const label = kind === 'skill' ? 'skill' : 'MCP'

  return (
    <section
      data-drop-zone="inventory"
      data-testid={`grid-${kind}`}
      aria-label={TITLE[kind]}
      className="mc-panel w-max p-3"
    >
      <h3 className="mb-2 px-0.5 font-pixel text-lg text-inv-ink">{TITLE[kind]}</h3>
      <div
        data-drop="grid"
        data-character={characterId}
        data-kind={kind}
        className="grid grid-cols-[repeat(4,2.75rem)] gap-1"
      >
        {Array.from({ length: GRID_SIZE }, (_, i) => {
          const item = ids[i] ? getItem(ids[i]) : undefined
          return (
            <InventorySlot
              key={item?.id ?? `empty-${i}`}
              item={item}
              drag={item && { itemId: item.id, source: 'grid', characterId }}
              onActivate={() => item && wear(characterId, item.id)}
              onRemove={() => item && unequip(characterId, item.id)}
              onEmptyClick={() => setShopOpen(true, kind)}
              emptyLabel={`Empty ${label} slot. Open the shop to add one.`}
              activateHint={`Enter to wear it on its ${item?.socket} slot.`}
            />
          )
        })}
      </div>
    </section>
  )
}
