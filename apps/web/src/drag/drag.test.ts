import { describe, expect, it } from 'vitest'
import { getItem } from '../items/registry'
import { dropAction } from './drag'

const pdf = getItem('pdf')! // skill, hand
const shop = { itemId: 'pdf', source: 'shop' as const }
const fromGrid = { itemId: 'pdf', source: 'grid' as const, characterId: 'clawd' }
const fromWorn = { itemId: 'pdf', source: 'worn' as const, characterId: 'clawd' }
const char = { drop: 'character', character: 'clawd' }
const skills = { drop: 'grid', character: 'clawd', kind: 'skill' }
const mcps = { drop: 'grid', character: 'clawd', kind: 'mcp' }
const hand = { drop: 'worn', character: 'clawd', socket: 'hand' }
const head = { drop: 'worn', character: 'clawd', socket: 'head' }

describe('dropAction', () => {
  it('equips shop items dropped on a character or the matching grid', () => {
    expect(dropAction(shop, char, false, pdf)).toEqual({ type: 'equip', characterId: 'clawd' })
    expect(dropAction(shop, skills, false, pdf)).toEqual({ type: 'equip', characterId: 'clawd' })
    expect(dropAction(shop, mcps, false, pdf)).toBeNull()
  })

  it('cancels shop drags that land on nothing', () => {
    expect(dropAction(shop, null, false, pdf)).toBeNull()
  })

  it('wears grid items dropped on their own socket only', () => {
    expect(dropAction(fromGrid, hand, false, pdf)).toEqual({ type: 'wear', characterId: 'clawd' })
    expect(dropAction(fromGrid, head, false, pdf)).toBeNull()
  })

  it('returns worn items to their grid', () => {
    expect(dropAction(fromWorn, skills, false, pdf)).toEqual({ type: 'unwear', characterId: 'clawd' })
  })

  it('removes grid or worn items dragged out of the inventory', () => {
    expect(dropAction(fromGrid, null, false, pdf)).toEqual({ type: 'unequip', characterId: 'clawd' })
    expect(dropAction(fromWorn, null, false, pdf)).toEqual({ type: 'unequip', characterId: 'clawd' })
  })

  it('cancels when dropped on an inventory panel background or another character', () => {
    expect(dropAction(fromGrid, null, true, pdf)).toBeNull()
    expect(dropAction(fromGrid, { ...hand, character: 'other' }, false, pdf)).toBeNull()
  })
})
