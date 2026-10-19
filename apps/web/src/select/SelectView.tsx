import { motion } from 'motion/react'
import { useEffect, useId, useRef } from 'react'
import type { CharacterDef } from '../characters/types'
import { resolveEquipped } from '../items/registry'
import { Rig } from '../rig/Rig'
import { SelectPanel } from './SelectPanel'
import { SpeechBubble } from './SpeechBubble'

interface SelectViewProps {
  character: CharacterDef
  onClose: () => void
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** Character-select overlay: blurred backdrop, character center stage, stats panel. */
export function SelectView({ character, onClose }: SelectViewProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingId = useId()

  // Focus into the dialog, trap Tab, close on Escape, restore focus on exit.
  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLElement>('[aria-label^="Close"]')?.focus()

    const onKey = (e: KeyboardEvent) => {
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
        onClick={onClose}
        data-testid="select-backdrop"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-end gap-4 p-4 md:flex-row md:justify-center md:gap-16 md:p-10"
      >
        <div className="flex flex-1 items-center justify-center md:flex-none">
          <motion.div
            layoutId={`sprite-${character.id}`}
            className="pointer-events-auto relative aspect-[4/3] w-[180px] md:w-[300px]"
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <Rig rig={character.rig} mode="selected" items={resolveEquipped(character.equipped)} className="size-full" />
            <SpeechBubble name={character.name} />
          </motion.div>
        </div>
        <motion.div
          className="pointer-events-auto max-h-[58vh] w-full max-w-md overflow-y-auto rounded-3xl md:max-h-none md:w-[400px] md:overflow-visible"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40, transition: { duration: 0.18 } }}
          transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.08 }}
        >
          <SelectPanel character={character} onClose={onClose} headingId={headingId} />
        </motion.div>
      </div>
    </>
  )
}
