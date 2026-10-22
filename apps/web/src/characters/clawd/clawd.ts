import type { SpriteFrame } from '../../pixel/PixelSprite'
import type { CharacterDef } from '../types'

const W = 24
const H = 16

type Eyes = 'open' | 'blink' | 'wide' | 'happy'
/** straight: legs under the body; splay: outer legs out, inner in; up: pulled up (kicking). */
type Legs = 'straight' | 'splay' | 'up'

/** Draw one Clawd frame on a 24×16 grid. o = body, s = shade, k = ink. */
function draw({ eyes = 'open', legs = 'straight', liftLeg, armsUp = false, squash = false }: {
  eyes?: Eyes
  legs?: Legs
  /** Index (0–3, left to right) of one leg drawn a pixel shorter, for the walk ripple. */
  liftLeg?: number
  armsUp?: boolean
  squash?: boolean
}): string[] {
  const g = Array.from({ length: H }, () => Array<string>(W).fill('.'))
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    for (let r = y; r < y + h; r++) for (let col = x; col < x + w; col++) g[r][col] = c
  }

  const top = squash ? 5 : 2
  const bodyH = squash ? 9 : 10
  const base = top + bodyH
  rect(3, top, 18, bodyH, 'o')
  rect(3, base - 1, 18, 1, 's')

  const armY = armsUp ? top - 1 : top + 3
  rect(0, armY, 3, 3, 'o')
  rect(21, armY, 3, 3, 'o')

  for (const ex of [7, 15]) {
    if (eyes === 'open') rect(ex, top + 2, 2, 4, 'k')
    if (eyes === 'blink') rect(ex, top + 4, 2, 1, 'k')
    if (eyes === 'wide') rect(ex - 1, top + 1, 3, 5, 'k')
    if (eyes === 'happy') {
      rect(ex - 1, top + 4, 1, 1, 'k')
      rect(ex, top + 3, 2, 1, 'k')
      rect(ex + 2, top + 4, 1, 1, 'k')
    }
  }

  const legH = H - base
  const legXs = legs === 'splay' ? [3, 8, 14, 19] : [5, 8, 14, 17]
  const h = legs === 'up' ? Math.max(1, legH - 2) : legH
  legXs.forEach((lx, i) => rect(lx, base, 2, i === liftLeg ? h - 1 : h, 's'))

  return g.map((row) => row.join(''))
}

const f = (ms: number, opts: Parameters<typeof draw>[0]): SpriteFrame => ({ ms, rows: draw(opts) })

export const clawd: CharacterDef = {
  id: 'clawd',
  name: 'Claude',
  company: 'Anthropic',
  model: 'Claude Opus 5.5',
  sprite: {
    palette: { o: '#D97757', s: '#B9603F', k: '#1F1E1D' },
    frames: {
      idle: [f(2600, {}), f(140, { eyes: 'blink' })],
      // One leg lifts per hop, rippling across all four.
      walk: [0, 1, 2, 3].map((liftLeg) => f(0, { liftLeg })),
      held: [f(110, { eyes: 'wide', legs: 'up' }), f(110, { eyes: 'wide', legs: 'splay' })],
      land: [f(450, { squash: true, legs: 'splay' })],
      selected: [f(420, { eyes: 'happy' }), f(420, { eyes: 'happy', armsUp: true, legs: 'splay' })],
    },
    sockets: {
      head: { x: 8, y: -5 },
      hand: { x: 18, y: 4 },
      back: { x: -3, y: 0, behind: true },
      feet: { x: 8, y: 9 },
    },
  },
  stats: { reasoning: 95, code: 97, speed: 70, context: 88, cost: 75 },
  starter: { skills: [], mcps: [], worn: { head: 'frontend-design' } },
  spawn: { x: 0.5, y: 0.62 },
}
