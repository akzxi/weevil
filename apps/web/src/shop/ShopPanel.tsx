import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getCharacter } from '../characters/registry'
import { dragSource } from '../drag/drag'
import { catalog } from '../items/catalog'
import type { ItemKind } from '../items/types'
import { PixelIcon } from '../pixel/PixelArt'
import { loadoutOf, useWeevil } from '../state/store'

const TABS: { kind: ItemKind; title: string }[] = [
  { kind: 'skill', title: 'Skills' },
  { kind: 'mcp', title: 'MCPs' },
]

export function ShopPanel() {
  const open = useWeevil((s) => s.shopOpen)
  const setShopOpen = useWeevil((s) => s.setShopOpen)
  return (
    <AnimatePresence>{open && <Shop key="shop" onClose={() => setShopOpen(false)} />}</AnimatePresence>
  )
}

function Shop({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const tab = useWeevil((s) => s.shopTab)
  const setShopTab = useWeevil((s) => s.setShopTab)
  // Equip buttons only make sense for a specific character, so they appear only on the select screen.
  const target = getCharacter(useWeevil((s) => s.selectedId) ?? '')
  const loadout = useWeevil((s) => (target ? loadoutOf(s.loadouts, target.id) : undefined))
  const equip = useWeevil((s) => s.equip)
  // The shop is still fading out when a drag starts from it; don't let it swallow the drop.
  const passThrough = useWeevil((s) => s.drag) ? ' pointer-events-none' : ''

  const owned = new Set(loadout ? [...loadout.skills, ...loadout.mcps, ...Object.values(loadout.worn)] : [])
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter((i) => i.kind === tab && (!q || `${i.name} ${i.description} ${i.id}`.toLowerCase().includes(q)))
  }, [query, tab])

  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null
    searchRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      returnTo?.focus?.()
    }
  }, [onClose])

  return (
    <>
      <motion.div
        className={`fixed inset-0 z-[45] bg-backdrop${passThrough}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        data-testid="shop-backdrop"
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Shop"
        className={`mc-panel fixed inset-x-2 bottom-2 z-[46] flex h-[78vh] flex-col p-4 md:inset-x-auto md:top-4 md:right-4 md:bottom-4 md:h-auto md:w-[400px]${passThrough}`}
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0, transition: { duration: 0.15 } }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-pixel text-2xl text-inv-ink">Shop</h2>
            <p className="text-sm text-inv-ink/75">
              {target ? `Drag onto ${target.name}, or use Equip.` : 'Drag an item onto a character to equip it.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shop"
            className="mc-slot grid size-9 shrink-0 place-items-center text-inv-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            <svg viewBox="0 0 8 8" className="size-3.5" shapeRendering="crispEdges" aria-hidden>
              <path d="M0 0h2v2H0zM2 2h2v2H2zM4 4h2v2H4zM6 6h2v2H6zM6 0h2v2H6zM0 6h2v2H0zM4 2h2v2H4zM2 4h2v2H2z" fill="currentColor" />
            </svg>
          </button>
        </header>

        <div className="mt-3 flex gap-2" role="group" aria-label="Item type">
          {TABS.map(({ kind, title }) => (
            <button
              key={kind}
              type="button"
              aria-pressed={tab === kind}
              onClick={() => setShopTab(kind)}
              className={`mc-button flex-1 py-1.5 font-pixel text-base ${tab === kind ? 'brightness-110' : 'opacity-70'}`}
            >
              {title}
            </button>
          ))}
        </div>

        <label className="mt-3 block">
          <span className="sr-only">Search {tab === 'skill' ? 'skills' : 'MCP servers'}</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'skill' ? 'Search skills' : 'Search MCP servers'}
            className="mc-slot w-full px-3 py-2 text-sm text-white placeholder:text-white/60 focus-visible:outline-2 focus-visible:outline-accent"
          />
        </label>

        <ul className="-mx-1 mt-3 flex flex-1 flex-col gap-1.5 overflow-y-auto px-1" data-testid="shop-list">
          {results.map((item) => {
            const has = owned.has(item.id)
            return (
              <li
                key={item.id}
                data-testid="shop-item"
                data-item={item.id}
                className="flex cursor-grab touch-pan-y items-center gap-3 p-1.5 hover:bg-white/20"
                onPointerDown={dragSource(() => ({ itemId: item.id, source: 'shop' }), onClose)}
              >
                <div className="mc-slot grid size-11 shrink-0 place-items-center">
                  <PixelIcon art={item.icon} className="size-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-inv-ink">{item.name}</div>
                  <div className="truncate text-xs text-inv-ink/75">{item.description}</div>
                </div>
                {target && (
                  <button
                    type="button"
                    disabled={has}
                    aria-label={has ? `${item.name} is equipped on ${target.name}` : `Equip ${item.name} on ${target.name}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => equip(target.id, item.id)}
                    className="mc-button shrink-0 px-2.5 py-1 text-xs disabled:opacity-60"
                  >
                    {has ? 'Equipped' : 'Equip'}
                  </button>
                )}
              </li>
            )
          })}
          {!results.length && (
            <li className="py-6 text-center text-sm text-inv-ink">Nothing matches "{query}". Try a shorter search.</li>
          )}
        </ul>
      </motion.aside>
    </>
  )
}
