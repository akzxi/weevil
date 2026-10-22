import { describe, expect, it } from 'vitest'
import { parseSSE } from './client'

describe('parseSSE', () => {
  it('parses complete events and keeps the unfinished tail for the next chunk', () => {
    const { events, rest } = parseSSE(
      'event: text\ndata: {"text":"Hi"}\n\nevent: text\ndata: {"text":" the',
    )
    expect(events).toEqual([{ event: 'text', data: { text: 'Hi' } }])
    expect(rest).toBe('event: text\ndata: {"text":" the')
  })

  it('handles CRLF line endings and multiple events in one chunk', () => {
    const { events, rest } = parseSSE(
      'event: thinking\r\ndata: {"text":"a"}\r\n\r\nevent: done\r\ndata: {"title":"t"}\r\n\r\n',
    )
    expect(events.map((e) => e.event)).toEqual(['thinking', 'done'])
    expect(rest).toBe('')
  })

  it('ignores comment-only blocks', () => {
    expect(parseSSE(': keep-alive\n\n').events).toEqual([])
  })
})
