import { getItem } from '../items/registry'
import { SOCKETS, type Socket } from '../items/types'
import { PixelIcon, type PixelArt } from '../pixel/PixelArt'
import { loadoutOf, useWeevil } from '../state/store'
import { InventorySlot } from './InventorySlot'

// Faint silhouettes for empty slots, like Minecraft's armour slots.
const ghost = (rows: string[]): PixelArt => ({ rows, palette: { x: 'currentColor' } })
const SILHOUETTE: Record<Socket, PixelArt> = {
  head: ghost(['........', '..xxxx..', '.xxxxxx.', '.xxxxxx.', '.x....x.', '.x....x.', '........', '........']),
  hand: ghost(['........', '...xx...', '..xxxx..', '..xxxx..', '..xxxx..', '...xx...', '...xx...', '........']),
  back: ghost(['........', '.xxxxxx.', '.xxxxxx.', '.xxxxxx.', '.xxxxxx.', '.xxxxxx.', '.x....x.', '........']),
  feet: ghost(['........', '........', '........', '.xx..xx.', '.xx..xx.', 'xxx.xxx.', 'xxx.xxx.', '........']),
}

/** 1×4 column of worn slots (head, hand, back, feet) beside the character. */
export function WornColumn({ characterId }: { characterId: string }) {
  const worn = useWeevil((s) => loadoutOf(s.loadouts, characterId).worn)
  const { unwear, unequip } = useWeevil.getState()

  return (
    <section data-drop-zone="inventory" data-testid="worn-column" aria-label="Worn" className="mc-panel flex flex-col gap-1 p-2">
      {SOCKETS.map((socket) => {
        const item = worn[socket] ? getItem(worn[socket]) : undefined
        return (
          <InventorySlot
            key={socket}
            item={item}
            drag={item && { itemId: item.id, source: 'worn', characterId }}
            onActivate={() => item && unwear(characterId, item.id)}
            onRemove={() => item && unequip(characterId, item.id)}
            emptyLabel={`Empty ${socket} slot. Drag a ${socket} item here from the grids.`}
            activateHint="Enter to take it off."
            placeholder={<PixelIcon art={SILHOUETTE[socket]} className="size-7" />}
            dropProps={{ 'data-drop': 'worn', 'data-character': characterId, 'data-socket': socket, 'data-testid': `worn-${socket}` }}
          />
        )
      })}
    </section>
  )
}
