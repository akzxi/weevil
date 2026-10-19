import { motion } from 'motion/react'

interface SpeechBubbleProps {
  name: string
}

/** Chat entry point. Does nothing yet; Milestone 2 opens a chat with this character. */
export function SpeechBubble({ name }: SpeechBubbleProps) {
  return (
    <motion.button
      type="button"
      aria-label={`Chat with ${name} (coming soon)`}
      title="Chat — coming soon"
      className="absolute -top-12 -right-10 origin-bottom-left cursor-pointer focus-visible:outline-none md:-top-14 md:-right-14 [&:focus-visible>div]:ring-2 [&:focus-visible>div]:ring-accent"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0, transition: { duration: 0.12 } }}
      transition={{ delay: 0.35, type: 'spring', stiffness: 420, damping: 18 }}
      whileHover={{ scale: 1.08, rotate: -3 }}
      whileTap={{ scale: 0.94 }}
    >
      <div className="relative flex items-center gap-1.5 rounded-2xl border border-panel-border bg-panel px-4 py-3 shadow-lg shadow-shadow">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-2 rounded-full bg-ink"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
        {/* Tail pointing down-left toward the character. */}
        <span className="absolute -bottom-1.5 left-3 size-3 rotate-45 border-r border-b border-panel-border bg-panel" />
      </div>
    </motion.button>
  )
}
