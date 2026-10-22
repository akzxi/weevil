import type { Page } from '@playwright/test'

/** In-memory stand-in for apps/api so browser tests never call a real model. */

interface Conv {
  id: string
  character_id: string
  title: string
  updated_at: string
}
interface Msg {
  id: number
  role: 'user' | 'assistant'
  text: string
  thinking: string
  stop_reason: string | null
  created_at: string
}

export interface Reply {
  thinking?: string
  text?: string
  stop_reason?: string
  error?: string
}

export interface MockOptions {
  reply?: (text: string) => Reply
  /** Hold the chat response this long before answering (to test Stop). */
  holdMs?: number
  offline?: boolean
}

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`

export async function mockApi(page: Page, options: MockOptions = {}) {
  const conversations: Conv[] = []
  const messages: Record<string, Msg[]> = {}
  let nextId = 1
  const now = () => new Date(Date.now() + nextId++).toISOString()
  const reply: (text: string) => Reply =
    options.reply ?? ((text) => ({ thinking: 'Considering it', text: `You said **${text}**.` }))

  // Match only the API, not Vite's own `/src/api/...` modules.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    if (options.offline) return route.abort('connectionrefused')
    const req = route.request()
    const path = new URL(req.url()).pathname
    const method = req.method()
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body })
    let m: RegExpMatchArray | null

    if ((m = path.match(/^\/api\/characters\/([\w-]+)\/conversations$/))) {
      if (method === 'GET') {
        return json([...conversations].filter((c) => c.character_id === m![1]).sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
      }
      const c = { id: `c${nextId++}`, character_id: m[1], title: 'New chat', updated_at: now() }
      conversations.push(c)
      messages[c.id] = []
      return json(c, 201)
    }

    if ((m = path.match(/^\/api\/conversations\/([\w-]+)$/))) {
      const c = conversations.find((x) => x.id === m![1])
      if (!c) return json({ detail: 'Not found' }, 404)
      if (method === 'DELETE') {
        conversations.splice(conversations.indexOf(c), 1)
        return route.fulfill({ status: 204 })
      }
      c.title = (req.postDataJSON() as { title: string }).title.trim()
      return json(c)
    }

    if ((m = path.match(/^\/api\/conversations\/([\w-]+)\/messages$/))) {
      const c = conversations.find((x) => x.id === m![1])
      if (!c) return json({ detail: 'Not found' }, 404)
      if (method === 'GET') return json(messages[c.id])

      const text = (req.postDataJSON() as { text: string }).text.trim()
      const user: Msg = { id: nextId++, role: 'user', text, thinking: '', stop_reason: null, created_at: now() }
      if (!messages[c.id].length) c.title = text.slice(0, 60)
      messages[c.id].push(user)
      c.updated_at = now()
      if (options.holdMs) await new Promise((r) => setTimeout(r, options.holdMs))

      const r = reply(text)
      let body = sse('user', { message: user })
      if (r.error) body += sse('error', { kind: 'api', message: r.error })
      else {
        if (r.thinking) body += sse('thinking', { text: r.thinking })
        for (const word of (r.text ?? '').split(/(?<= )/)) body += sse('text', { text: word })
        const saved: Msg = {
          id: nextId++,
          role: 'assistant',
          text: r.text ?? '',
          thinking: r.thinking ?? '',
          stop_reason: r.stop_reason ?? 'end_turn',
          created_at: now(),
        }
        messages[c.id].push(saved)
        body += sse('done', { message: saved, title: c.title })
      }
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body })
    }

    return json({ detail: 'Not found' }, 404)
  })
}
