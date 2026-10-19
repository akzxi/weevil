import { clawd } from './clawd/clawd'
import type { CharacterDef } from './types'

export const characters: CharacterDef[] = [clawd]

export const getCharacter = (id: string) => characters.find((c) => c.id === id)
