import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { clawd } from '../characters/clawd/clawd'
import { SelectPanel } from './SelectPanel'

describe('SelectPanel', () => {
  it('shows name, company and model', () => {
    render(<SelectPanel character={clawd} onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Clawd' })).toBeInTheDocument()
    expect(screen.getByText('Anthropic')).toBeInTheDocument()
    expect(screen.getByText('Claude Opus 5.5')).toBeInTheDocument()
  })

  it('shows a meter for each of the five stats', () => {
    render(<SelectPanel character={clawd} onClose={() => {}} />)
    const meters = screen.getAllByRole('meter')
    expect(meters.map((m) => m.getAttribute('aria-label'))).toEqual([
      'Reasoning',
      'Code',
      'Speed',
      'Context',
      'Cost',
    ])
    expect(screen.getByRole('meter', { name: 'Reasoning' })).toHaveAttribute('aria-valuenow', '95')
  })

  it('closes from the close button', async () => {
    const onClose = vi.fn()
    render(<SelectPanel character={clawd} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
