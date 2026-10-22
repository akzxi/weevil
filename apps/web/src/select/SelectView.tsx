import { motion } from 'motion/react'
import { useEffect, useId, useMemo, useRef } from 'react'
import type { CharacterDef } from '../characters/types'
import { PixelSprite } from '../pixel/PixelSprite'
import { wornItems } from '../state/inventory'
import { loadoutOf, useWeevil } from '../state/store'
import { InventoryGrid } from './InventoryGrid'
import { SelectPanel } from './SelectPanel'
import { ThoughtBubble } from './ThoughtBubble'
import { WornColumn } from './WornColumn'

interface SelectViewProps {
  character: CharacterDef
  onClose: () => void
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** Character-select overlay: blurred backdrop, character center stage, stats and inventories. */
export function SelectView({ character, onClose }: SelectViewProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingId = useId()
  const worn = useWeevil((s) => loadoutOf(s.loadouts, character.id).worn)
  const items = useMemo(() => wornItems({ skills: [], mcps: [], worn }), [worn])

  // Focus into the dialog, trap Tab, close on Escape, restore focus on exit.
  // The shop and drag layer sit above this dialog and handle their own keys first.
  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLElement>('[aria-label^="Close"]')?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (useWeevil.getState().shopOpen) return
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab' || !dialogRef.current) return
      const nodes = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      returnTo?.focus?.()
    }
  }, [onClose])

  return (
    <>
      <motion.div
        className="fixed inset-0 z-20 bg-backdrop backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        data-testid="select-backdrop"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        data-testid="select-dialog"
        data-autoscroll
        className="fixed inset-0 z-30 overflow-y-auto px-4 pt-24 pb-6 md:grid md:place-items-center md:py-10"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="mx-auto grid w-full max-w-md gap-5 md:w-auto md:max-w-none md:grid-cols-[auto_400px] md:items-center md:gap-x-12 md:gap-y-6">
          <div className="flex items-center justify-center gap-6 md:gap-10">
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ delay: 0.2 }}
            >
              <WornColumn characterId={character.id} />
            </motion.div>
            <motion.div
              layoutId={`sprite-${character.id}`}
              layoutCrossfade={false}
              // On close, hand straight over to the world sprite, which flies back alone: no ghost, no lingering cheer.
              exit={{ opacity: 0, transition: { duration: 0 } }}
              data-drop="character"
              data-character={character.id}
              className="relative aspect-[3/2] w-[168px] md:w-[300px]"
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            >
              <PixelSprite sprite={character.sprite} mode="selected" worn={items} className="size-full" />
              <ThoughtBubble name={character.name} />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.08 }}
          >
            <SelectPanel character={character} onClose={onClose} headingId={headingId} />
          </motion.div>

          <motion.div
            className="flex flex-wrap justify-center gap-4 md:col-span-2 md:gap-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.14 }}
          >
            <InventoryGrid characterId={character.id} kind="skill" />
            <InventoryGrid characterId={character.id} kind="mcp" />
          </motion.div>
        </div>
      </div>
    </>
  )
}
