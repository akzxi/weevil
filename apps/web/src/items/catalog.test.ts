import { describe, expect, it } from 'vitest'
import { catalog } from './catalog'
import { SOCKETS } from './types'

describe('catalog', () => {
  it('has unique ids and at least ten of each kind', () => {
    const ids = catalog.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(catalog.filter((i) => i.kind === 'skill').length).toBeGreaterThanOrEqual(10)
    expect(catalog.filter((i) => i.kind === 'mcp').length).toBeGreaterThanOrEqual(10)
  })

  it.each(catalog.map((i) => [i.id, i] as const))('%s has a valid 8×8 icon, socket and short description', (_, item) => {
    expect(item.icon.rows).toHaveLength(8)
    for (const row of item.icon.rows) {
      expect(row).toHaveLength(8)
      for (const ch of row) if (ch !== '.') expect(item.icon.palette).toHaveProperty(ch)
    }
    expect(SOCKETS).toContain(item.socket)
    expect(item.description.length).toBeLessThanOrEqual(60)
  })
})
