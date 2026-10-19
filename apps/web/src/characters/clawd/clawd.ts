import type { PartDef } from '../../rig/types'
import type { CharacterDef } from '../types'
import { ArmLeft, ArmRight, Body, CLAWD_PALETTE, EyeLeft, EyeRight, Legs } from './ClawdParts'

const legPivotX = [30, 44, 76, 90]

const legs: PartDef[] = Legs.map((Art, i) => ({
  id: `leg_${i + 1}`,
  role: 'leg',
  layer: 0,
  pivot: { x: legPivotX[i], y: 62 },
  // Outer and inner pairs swing opposite each other.
  phase: i === 1 || i === 2 ? 1 : 0,
  Art,
}))

export const clawd: CharacterDef = {
  id: 'clawd',
  name: 'Clawd',
  company: 'Anthropic',
  model: 'Claude Opus 5.5',
  palette: { primary: CLAWD_PALETTE.primary, ink: CLAWD_PALETTE.ink },
  rig: {
    viewBox: { width: 120, height: 90 },
    parts: [
      ...legs,
      { id: 'body', role: 'body', layer: 1, pivot: { x: 60, y: 68 }, Art: Body },
      { id: 'arm_l', role: 'arm', parent: 'body', layer: 0, pivot: { x: 19, y: 42 }, phase: 0, Art: ArmLeft },
      { id: 'arm_r', role: 'arm', parent: 'body', layer: 0, pivot: { x: 101, y: 42 }, phase: 1, Art: ArmRight },
      { id: 'eye_l', role: 'eye', parent: 'body', layer: 1, pivot: { x: 44, y: 37 }, Art: EyeLeft },
      { id: 'eye_r', role: 'eye', parent: 'body', layer: 1, pivot: { x: 76, y: 37 }, Art: EyeRight },
    ],
    sockets: {
      head: { part: 'body', x: 60, y: 18 },
      hand_l: { part: 'arm_l', x: 8, y: 48 },
      hand_r: { part: 'arm_r', x: 112, y: 48 },
      back: { part: 'body', x: 60, y: 40 },
      aura: { part: 'body', x: 60, y: 45 },
    },
  },
  stats: { reasoning: 95, code: 97, speed: 70, context: 88, cost: 75 },
  slots: [{ kind: 'skill' }, { kind: 'skill' }, { kind: 'mcp' }, { kind: 'mcp' }],
  equipped: ['wizard-hat', null, null, null],
  spawn: { x: 0.5, y: 0.62 },
}
