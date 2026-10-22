import { useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { ItemDef, Socket } from '../items/types'
import type { WanderMode } from '../world/wander'
import { PixelRects } from './PixelArt'

export type SpriteMode = WanderMode | 'selected'

export interface SpriteFrame {
  rows: string[]
  /** How long this frame shows before the next. Ignored for walk, which advances per hop. */
  ms: number
}

export interface SpriteDef {
  palette: Record<string, string>
  frames: Record<SpriteMode, SpriteFrame[]>
  /** Top-left (in sprite pixels) where an 8×8 worn icon is drawn; `behind` draws it under the body. */
  sockets: Record<Socket, { x: number; y: number; behind?: boolean }>
}

interface PixelSpriteProps {
  sprite: SpriteDef
  mode: SpriteMode
  /** Wander hop count; walk frames follow it so the legs move with each hop. */
  step?: number
  worn: ItemDef[]
  className?: string
}

export function PixelSprite({ sprite, mode, step = 0, worn, className }: PixelSpriteProps) {
  const frames = sprite.frames[mode]
  const reduceMotion = useReducedMotion()
  const [tick, setTick] = useState(0)
  const timed = mode !== 'walk' && !reduceMotion && frames.length > 1

  useEffect(() => {
    if (!timed) return
    const id = setTimeout(() => setTick((t) => t + 1), frames[tick % frames.length].ms)
    return () => clearTimeout(id)
  }, [timed, frames, tick])

  const index = reduceMotion ? 0 : mode === 'walk' ? step : tick
  const frame = frames[index % frames.length]
  const width = frame.rows[0].length
  const height = frame.rows.length

  const items = (behind: boolean) =>
    worn
      .filter((item) => !!sprite.sockets[item.socket].behind === behind)
      .map((item) => {
        const { x, y } = sprite.sockets[item.socket]
        return (
          <g key={item.id} data-item={item.id} data-socket={item.socket}>
            <PixelRects art={item.icon} x={x} y={y} />
          </g>
        )
      })

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      shapeRendering="crispEdges"
      className={className}
      data-mode={mode}
      aria-hidden
    >
      {items(true)}
      <PixelRects art={{ rows: frame.rows, palette: sprite.palette }} />
      {items(false)}
    </svg>
  )
}
