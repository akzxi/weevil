import type { ItemDef } from './types'

const Art = () => (
  <g transform="rotate(-10) translate(0 1)">
    <path d="M-15 0 L15 0 L4 -33 Z" fill="#6E56CF" />
    <path
      d="M-1 -19 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 Z"
      fill="#F5C842"
    />
    <circle cx={6} cy={-24} r={1.5} fill="#F5C842" />
    <ellipse cx={0} cy={0} rx={21} ry={4.5} fill="#5842B4" />
  </g>
)

export const wizardHat: ItemDef = {
  id: 'wizard-hat',
  name: 'Frontend Design',
  kind: 'skill',
  description: 'A skill for crafting distinctive, polished interfaces.',
  socket: 'head',
  Art,
  capability: { type: 'skill', ref: 'frontend-design' },
}
