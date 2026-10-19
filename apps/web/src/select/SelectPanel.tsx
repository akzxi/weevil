import type { CharacterDef, StatKey } from '../characters/types'
import { ItemSlots } from './ItemSlots'
import { StatBar } from './StatBar'

const STATS: { key: StatKey; label: string }[] = [
  { key: 'reasoning', label: 'Reasoning' },
  { key: 'code', label: 'Code' },
  { key: 'speed', label: 'Speed' },
  { key: 'context', label: 'Context' },
  { key: 'cost', label: 'Cost' },
]

interface SelectPanelProps {
  character: CharacterDef
  onClose: () => void
  headingId?: string
}

export function SelectPanel({ character, onClose, headingId }: SelectPanelProps) {
  return (
    <div className="relative flex flex-col gap-6 rounded-3xl border border-panel-border bg-panel p-6 shadow-2xl shadow-shadow">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close character select"
        className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-ink-muted transition hover:bg-track hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <header>
        <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Character select</p>
        <h2 id={headingId} className="mt-1 font-display text-5xl font-bold tracking-tight">
          {character.name}
        </h2>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-muted">{character.company}</span>
          <span className="text-ink-muted opacity-40" aria-hidden>
            ·
          </span>
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-mono text-xs">{character.model}</span>
        </p>
      </header>

      <section aria-label="Stats" className="flex flex-col gap-2.5">
        {STATS.map(({ key, label }, i) => (
          <StatBar key={key} label={label} value={character.stats[key]} index={i} dollars={key === 'cost'} />
        ))}
      </section>

      <section aria-label="Equipped">
        <h3 className="mb-2.5 text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">Equipped</h3>
        <ItemSlots slots={character.slots} equipped={character.equipped} />
      </section>
    </div>
  )
}
