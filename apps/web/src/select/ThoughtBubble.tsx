import { motion } from 'motion/react'
import { PixelIcon, type PixelArt } from '../pixel/PixelArt'
import { useWeevil } from '../state/store'

// k = outline (theme ink), w = fill (theme panel); CSS vars keep the cloud right in both themes.
const palette = { k: 'var(--ink)', w: 'var(--bubble)' }

const cloud: PixelArt = {
  palette,
  rows: [
    '.......kkkk...........',
    '....kkkwwwwkk.kkkk....',
    '...kwwwwwwwwwkwwwwk...',
    '.kkwwwwwwwwwwwwwwwwkk.',
    'kwwwwwwwwwwwwwwwwwwwwk',
    'kwwwwwwwwwwwwwwwwwwwwk',
    'kwwwwwwwwwwwwwwwwwwwwk',
    '.kkwwwwwwwwwwwwwwwwkk.',
    '...kwwwwkkwwwwwkkkk...',
    '....kkkk..kkkkk.......',
  ],
}
const puff = (size: 2 | 3): PixelArt => ({
  palette,
  rows: size === 3 ? ['.k.', 'kwk', '.k.'] : ['kk', 'kk'],
})

/** Opens the full-screen chat with this character. */
export function ThoughtBubble({ characterId, name }: { characterId: string; name: string }) {
  const openChat = useWeevil((s) => s.openChat)
  return (
    <motion.button
      type="button"
      aria-label={`Chat with ${name}`}
      title={`Chat with ${name}`}
      onClick={() => openChat(characterId)}
      className="absolute -top-16 -right-10 cursor-pointer focus-visible:outline-none md:-top-20 md:-right-12 [&:focus-visible_.cloud]:outline-2 [&:focus-visible_.cloud]:outline-offset-2 [&:focus-visible_.cloud]:outline-accent"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.35, type: 'spring', stiffness: 420, damping: 18 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      style={{ originX: 0, originY: 1 }}
    >
      <div className="cloud relative w-[110px] md:w-[132px]">
        <PixelIcon art={cloud} className="w-full" />
        <div className="absolute inset-x-0 top-[42%] flex justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-2 bg-ink"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
      {/* Trailing puffs lead the eye from Clawd up to the cloud. */}
      <PixelIcon art={puff(3)} className="absolute -bottom-3 left-2 size-3.5" />
      <PixelIcon art={puff(2)} className="absolute -bottom-7 -left-1 size-2" />
    </motion.button>
  )
}
