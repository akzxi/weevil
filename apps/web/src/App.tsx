import { AnimatePresence, MotionConfig } from 'motion/react'
import { getCharacter } from './characters/registry'
import { DragLayer } from './drag/DragLayer'
import { SelectView } from './select/SelectView'
import { ShopButton } from './shop/ShopButton'
import { ShopPanel } from './shop/ShopPanel'
import { useWeevil } from './state/store'
import { ThemeToggle } from './theme/ThemeToggle'
import { World } from './world/World'

export default function App() {
  const selectedId = useWeevil((s) => s.selectedId)
  const deselect = useWeevil((s) => s.deselect)
  const selected = selectedId ? getCharacter(selectedId) : undefined

  return (
    <MotionConfig reducedMotion="user">
      <main className="world fixed inset-0 overflow-hidden font-sans text-ink">
        <header className="pointer-events-none absolute inset-x-0 top-0 z-10 p-5 md:p-7">
          <h1 className="font-display text-3xl font-bold tracking-tight">weevil</h1>
          <p className="text-sm text-ink-muted">a little world of AI models</p>
        </header>

        {/* Above the select overlay so the shop and theme stay reachable from both screens. */}
        <div className="fixed top-5 right-5 z-40 flex items-center gap-3 md:top-7 md:right-7">
          <ShopButton />
          <ThemeToggle />
        </div>

        <World />

        <p className="pointer-events-none absolute inset-x-0 bottom-5 text-center text-sm text-ink-muted">
          Click a character to select · drag to move them around
        </p>

        <AnimatePresence>
          {selected && <SelectView key={selected.id} character={selected} onClose={deselect} />}
        </AnimatePresence>
        <ShopPanel />
        <DragLayer />
      </main>
    </MotionConfig>
  )
}
