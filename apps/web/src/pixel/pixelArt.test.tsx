import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PixelIcon, pixelRuns } from './PixelArt'

const art = { rows: ['aa.b', '.bbb'], palette: { a: '#111', b: '#222' } }

describe('pixelRuns', () => {
  it('merges same-colour horizontal runs and skips transparent pixels', () => {
    expect(pixelRuns(art)).toEqual([
      { x: 0, y: 0, w: 2, fill: '#111' },
      { x: 3, y: 0, w: 1, fill: '#222' },
      { x: 1, y: 1, w: 3, fill: '#222' },
    ])
  })
})

describe('PixelIcon', () => {
  it('renders a crisp svg sized to the art', () => {
    const { container } = render(<PixelIcon art={art} className="size-8" />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 4 2')
    expect(svg.getAttribute('shape-rendering')).toBe('crispEdges')
    expect(svg.querySelectorAll('rect')).toHaveLength(3)
  })
})
