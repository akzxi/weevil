import { AnimatePresence, MotionConfig } from 'motion/react'
import { getCharacter } from './characters/registry'
import { SelectView } from './select/SelectView'
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
        <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-5 md:p-7">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">weevil</h1>
            <p className="text-sm text-ink-muted">a little world of AI models</p>
          </div>
          <div className="pointer-events-auto">
            <ThemeToggle />
          </div>
        </header>

        <World />

        <p className="pointer-events-none absolute inset-x-0 bottom-5 text-center text-sm text-ink-muted">
          Click a character to select · drag to move them around
        </p>

        <AnimatePresence>
          {selected && <SelectView key={selected.id} character={selected} onClose={deselect} />}
        </AnimatePresence>
      </main>
    </MotionConfig>
  )
}
