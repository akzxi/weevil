import { motion } from 'motion/react'

interface StatBarProps {
  label: string
  value: number
  index: number
  /** Cost reads as $ pips (higher = pricier) instead of a number. */
  dollars?: boolean
}

export function StatBar({ label, value, index, dollars }: StatBarProps) {
  const pips = Math.max(1, Math.round(value / 20))
  return (
    <div className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3">
      <span className="text-sm text-ink-muted">{label}</span>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="h-2.5 overflow-hidden rounded-full bg-track"
      >
        <motion.div
          className={`h-full origin-left rounded-full ${dollars ? 'bg-ink-muted' : 'bg-accent'}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: value / 100 }}
          transition={{ delay: 0.25 + index * 0.07, type: 'spring', stiffness: 120, damping: 18 }}
        />
      </div>
      <span className="text-right font-mono text-sm tabular-nums">
        {dollars ? (
          <>
            {'$'.repeat(pips)}
            <span className="opacity-25">{'$'.repeat(5 - pips)}</span>
          </>
        ) : (
          value
        )}
      </span>
    </div>
  )
}
