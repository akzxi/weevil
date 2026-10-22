import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { characters, getCharacter } from '../characters/registry'
import { dragSource } from '../drag/drag'
import { catalog } from '../items/catalog'
import type { ItemKind } from '../items/types'
import { PixelIcon } from '../pixel/PixelArt'
import { loadoutOf, useWeevil } from '../state/store'

const GROUPS: { kind: ItemKind; title: string }[] = [
  { kind: 'skill', title: 'Skills' },
  { kind: 'mcp', title: 'MCP servers' },
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
  // shortcut: keyboard "Equip" targets the selected character, else the first one; add a picker once there are several.
  const targetId = useWeevil((s) => s.selectedId) ?? characters[0].id
  const target = getCharacter(targetId)!
  const loadout = useWeevil((s) => loadoutOf(s.loadouts, targetId))
  const equip = useWeevil((s) => s.equip)
  // The shop is still fading out when a drag starts from it; don't let it swallow the drop.
  const passThrough = useWeevil((s) => s.drag) ? ' pointer-events-none' : ''

  const owned = new Set([...loadout.skills, ...loadout.mcps, ...Object.values(loadout.worn)])
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter((i) => !q || `${i.name} ${i.description} ${i.id}`.toLowerCase().includes(q))
  }, [query])

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
            <p className="text-sm text-inv-ink/75">Drag an item onto a character to equip it.</p>
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

        <label className="mt-3 block">
          <span className="sr-only">Search skills and MCP servers</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills and MCPs"
            className="mc-slot w-full px-3 py-2 text-sm text-white placeholder:text-white/60 focus-visible:outline-2 focus-visible:outline-accent"
          />
        </label>

        <div className="-mx-1 mt-3 flex-1 overflow-y-auto px-1" data-testid="shop-list">
          {GROUPS.map(({ kind, title }) => {
            const items = results.filter((i) => i.kind === kind)
            if (!items.length) return null
            return (
              <section key={kind} className="mb-4">
                <h3 className="mb-1.5 font-pixel text-base text-inv-ink">{title}</h3>
                <ul className="flex flex-col gap-1.5">
                  {items.map((item) => {
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
                        <button
                          type="button"
                          disabled={has}
                          aria-label={has ? `${item.name} is equipped on ${target.name}` : `Equip ${item.name} on ${target.name}`}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => equip(targetId, item.id)}
                          className="mc-button shrink-0 px-2.5 py-1 text-xs disabled:opacity-60"
                        >
                          {has ? 'Equipped' : 'Equip'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
          {!results.length && <p className="py-6 text-center text-sm text-inv-ink">Nothing matches "{query}". Try a shorter search.</p>}
        </div>
      </motion.aside>
    </>
  )
}
