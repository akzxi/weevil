import { motion, useReducedMotion } from 'motion/react'
import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { CharacterDef } from '../characters/types'
import { PixelSprite } from '../pixel/PixelSprite'
import { wornItems } from '../state/inventory'
import { loadoutOf, useWeevil } from '../state/store'
import { applyEntry, viewportBounds, type SpriteRegistry } from './useWanderLoop'
import { createWanderState, grab, isDrag, moveHeld, release, type Facing, type WanderMode } from './wander'

// 24×16 sprite pixels at 4px each.
const WIDTH = 96
const HEIGHT = 64

interface SpriteProps {
  character: CharacterDef
  registry: SpriteRegistry
  selected: boolean
  onSelect: (id: string) => void
}

export function Sprite({ character, registry, selected, onSelect }: SpriteProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [mode, setMode] = useState<WanderMode>('idle')
  const [facing, setFacing] = useState<Facing>(1)
  const [step, setStep] = useState(0)
  const reduceMotion = useReducedMotion()
  const press = useRef<{ x: number; y: number; dragging: boolean } | null>(null)
  const justDragged = useRef(false)
  const worn = useWeevil((s) => loadoutOf(s.loadouts, character.id).worn)
  const items = useMemo(() => wornItems({ skills: [], mcps: [], worn }), [worn])

  useLayoutEffect(() => {
    const config = {
      size: { width: WIDTH, height: HEIGHT },
      stepSize: 8,
      stepRate: 6,
      idle: [1.2, 3.5] as [number, number],
      landDuration: 0.45,
      canWalk: !reduceMotion,
    }
    const existing = registry.get(character.id)
    if (existing) {
      existing.config = config
      return
    }
    const entry = {
      el: ref.current!,
      state: createWanderState(character.spawn, viewportBounds(), config),
      config,
      paused: false,
      reported: { mode: 'idle' as WanderMode, facing: 1 as Facing, step: 0 },
      onChange: (m: WanderMode, f: Facing, n: number) => {
        setStep(n)
        setMode(m)
        setFacing(f)
      },
    }
    registry.set(character.id, entry)
    applyEntry(entry)
  }, [registry, character.id, character.spawn, reduceMotion])

  useLayoutEffect(() => () => void registry.delete(character.id), [registry, character.id])

  useLayoutEffect(() => {
    const entry = registry.get(character.id)
    if (entry) entry.paused = selected
  }, [registry, character.id, selected])

  const entry = () => registry.get(character.id)!

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (selected || e.button !== 0) return
    // Touch drags often end without a click, so a stale flag must not eat the next tap.
    justDragged.current = false
    press.current = { x: e.clientX, y: e.clientY, dragging: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current
    if (!p) return
    const sprite = entry()
    if (!p.dragging) {
      if (!isDrag(p.x, p.y, e.clientX, e.clientY)) return
      p.dragging = true
      sprite.state = grab(sprite.state, p.x, p.y)
    }
    sprite.state = moveHeld(sprite.state, e.clientX, e.clientY)
    applyEntry(sprite)
  }

  const endPress = () => {
    const p = press.current
    press.current = null
    if (!p?.dragging) return
    const sprite = entry()
    sprite.state = release(sprite.state, viewportBounds(), sprite.config)
    applyEntry(sprite)
    justDragged.current = true
  }

  const onClick = () => {
    // A drag ends with a click event; swallow it so dropping doesn't select.
    if (justDragged.current) {
      justDragged.current = false
      return
    }
    onSelect(character.id)
  }

  const held = mode === 'held'

  return (
    <button
      ref={ref}
      type="button"
      data-testid={`sprite-${character.id}`}
      data-drop="character"
      data-character={character.id}
      data-mode={mode}
      aria-label={`${character.name}, ${character.company}. Select to view, or drag to move.`}
      className={`absolute top-0 left-0 touch-none select-none focus-visible:outline-none [&:focus-visible_.focus-ring]:opacity-100 ${
        held ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{ width: WIDTH, height: HEIGHT }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onClick={onClick}
    >
      {/* Ground shadow stays put while the sprite is lifted. */}
      <motion.span
        aria-hidden
        className="absolute -bottom-1 left-1/2 h-3 w-16 -translate-x-1/2 rounded-[50%] bg-shadow blur-[2px]"
        animate={{ scale: held ? 0.55 : 1, opacity: selected ? 0 : held ? 0.35 : 0.7 }}
      />
      <span
        aria-hidden
        className="focus-ring absolute -inset-2 rounded-2xl opacity-0 ring-2 ring-accent transition-opacity"
      />
      {!selected && (
        <motion.div layoutId={`sprite-${character.id}`} layoutCrossfade={false} className="absolute inset-0" transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
          <motion.div
            className="size-full"
            animate={{ y: held ? -18 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: held ? 20 : 12 }}
          >
            <div className="size-full" style={{ transform: facing < 0 ? 'scaleX(-1)' : undefined }}>
              <PixelSprite sprite={character.sprite} mode={mode} step={step} worn={items} className="size-full" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </button>
  )
}
