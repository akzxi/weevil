import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { clawd } from '../characters/clawd/clawd'
import { getItem } from '../items/registry'
import { Rig } from './Rig'

describe('Rig', () => {
  it('renders every part of the rig', () => {
    const { container } = render(<Rig rig={clawd.rig} mode="idle" items={[]} />)
    for (const part of clawd.rig.parts) {
      expect(container.querySelector(`[data-part="${part.id}"]`)).not.toBeNull()
    }
  })

  it('nests child parts inside their parent so they inherit its motion', () => {
    const { container } = render(<Rig rig={clawd.rig} mode="idle" items={[]} />)
    const body = container.querySelector('[data-part="body"]')!
    for (const part of clawd.rig.parts.filter((p) => p.parent === 'body')) {
      expect(body.querySelector(`[data-part="${part.id}"]`)).not.toBeNull()
    }
  })

  it('renders an equipped item inside its socket, on the part the socket rides on', () => {
    const hat = getItem('wizard-hat')!
    const { container } = render(<Rig rig={clawd.rig} mode="idle" items={[hat]} />)
    const socket = container.querySelector(`[data-socket="${hat.socket}"]`)!
    expect(socket.querySelector('[data-item="wizard-hat"]')).not.toBeNull()
    const host = clawd.rig.sockets[hat.socket].part
    expect(socket.closest(`[data-part="${host}"]`)).not.toBeNull()
  })

  it('omits empty sockets', () => {
    const { container } = render(<Rig rig={clawd.rig} mode="idle" items={[]} />)
    expect(container.querySelector('[data-socket]')).toBeNull()
  })
})
