import { describe, expect, it } from 'vitest'
import { getItem } from '../items/registry'
import { GRID_SIZE, emptyLoadout, equip, unequip, unwear, wear, type Loadout } from './inventory'

const it_ = (id: string) => getItem(id)!
const pdf = it_('pdf') // skill, hand
const docx = it_('docx') // skill, hand
const github = it_('github') // mcp, back

describe('equip', () => {
  it('adds skills and MCPs to their own grids', () => {
    const l = equip(equip(emptyLoadout, pdf) as Loadout, github) as Loadout
    expect(l).toEqual({ skills: ['pdf'], mcps: ['github'], worn: {} })
  })

  it('ignores an item already in a grid or worn', () => {
    const l = equip(emptyLoadout, pdf) as Loadout
    expect(equip(l, pdf)).toBe(l)
    const worn: Loadout = { skills: [], mcps: [], worn: { hand: 'pdf' } }
    expect(equip(worn, pdf)).toBe(worn)
  })

  it('reports a full grid', () => {
    const full: Loadout = { skills: Array.from({ length: GRID_SIZE }, (_, i) => `s${i}`), mcps: [], worn: {} }
    expect(equip(full, pdf)).toBe('full')
  })
})

describe('unequip', () => {
  it('removes from a grid or from a worn slot', () => {
    const l: Loadout = { skills: ['pdf', 'docx'], mcps: [], worn: { back: 'github' } }
    expect(unequip(l, 'pdf')).toEqual({ skills: ['docx'], mcps: [], worn: { back: 'github' } })
    expect(unequip(l, 'github')).toEqual({ skills: ['pdf', 'docx'], mcps: [], worn: {} })
  })
})

describe('wear', () => {
  it('moves an item from its grid onto its socket', () => {
    const l: Loadout = { skills: ['pdf'], mcps: [], worn: {} }
    expect(wear(l, pdf)).toEqual({ skills: [], mcps: [], worn: { hand: 'pdf' } })
  })

  it('swaps with whatever already occupies the socket', () => {
    const l: Loadout = { skills: ['docx'], mcps: [], worn: { hand: 'pdf' } }
    expect(wear(l, docx)).toEqual({ skills: ['pdf'], mcps: [], worn: { hand: 'docx' } })
  })

  it('returns a displaced item of the other kind to its own grid', () => {
    const notion = it_('notion') // mcp, hand
    const l: Loadout = { skills: ['pdf'], mcps: [], worn: { hand: 'notion' } }
    expect(wear(l, pdf)).toEqual({ skills: [], mcps: [notion.id], worn: { hand: 'pdf' } })
  })

  it('ignores items that are not in the grid', () => {
    expect(wear(emptyLoadout, pdf)).toBe(emptyLoadout)
  })
})

describe('unwear', () => {
  it('moves a worn item back into its grid', () => {
    const l: Loadout = { skills: [], mcps: [], worn: { back: 'github' } }
    expect(unwear(l, github)).toEqual({ skills: [], mcps: ['github'], worn: {} })
  })

  it('reports a full grid and leaves the item worn', () => {
    const l: Loadout = { skills: [], mcps: Array.from({ length: GRID_SIZE }, (_, i) => `m${i}`), worn: { back: 'github' } }
    expect(unwear(l, github)).toBe('full')
  })
})
