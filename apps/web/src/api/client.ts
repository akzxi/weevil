/** Typed client for the weevil API (`apps/api`). In dev, Vite proxies `/api` to localhost:8000. */

export interface Conversation {
  id: string
  character_id: string
  title: string
  updated_at: string
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  thinking: string
  stop_reason: string | null
  created_at: string
}

export interface StreamHandlers {
  onUser: (message: ChatMessage) => void
  onThinking: (text: string) => void
  onText: (text: string) => void
  onDone: (message: ChatMessage, title: string) => void
  onError: (message: string) => void
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} failed (${res.status})`)
  return (res.status === 204 ? undefined : await res.json()) as T
}

export const api = {
  listConversations: (characterId: string) =>
    request<Conversation[]>(`/characters/${characterId}/conversations`),
  createConversation: (characterId: string) =>
    request<Conversation>(`/characters/${characterId}/conversations`, { method: 'POST' }),
  renameConversation: (id: string, title: string) =>
    request<Conversation>(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  deleteConversation: (id: string) => request<void>(`/conversations/${id}`, { method: 'DELETE' }),
  listMessages: (id: string) => request<ChatMessage[]>(`/conversations/${id}/messages`),
}

export interface SSEEvent {
  event: string
  data: unknown
}

/** Split buffered SSE text into complete events plus the unfinished remainder. */
export function parseSSE(buffer: string): { events: SSEEvent[]; rest: string } {
  const blocks = buffer.replace(/\r\n/g, '\n').split('\n\n')
  const rest = blocks.pop() ?? ''
  const events: SSEEvent[] = []
  for (const block of blocks) {
    let event = 'message'
    let data = ''
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7)
      else if (line.startsWith('data: ')) data += line.slice(6)
    }
    if (data) events.push({ event, data: JSON.parse(data) })
  }
  return { events, rest }
}

/**
 * Send a message and stream the reply. EventSource can't POST, so this reads the
 * response body directly. Aborting `signal` stops the stream (the server saves no partial reply).
 */
export async function streamChat(conversationId: string, text: string, on: StreamHandlers, signal: AbortSignal) {
  const res = await fetch(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  })
  if (!res.ok || !res.body) {
    on.onError(res.status === 422 ? 'That message is empty or too long.' : `Couldn't send (${res.status}).`)
    return
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    const parsed = parseSSE(buffer + value)
    buffer = parsed.rest
    for (const { event, data } of parsed.events) {
      const d = data as Record<string, unknown>
      if (event === 'user') on.onUser(d.message as ChatMessage)
      else if (event === 'thinking') on.onThinking(d.text as string)
      else if (event === 'text') on.onText(d.text as string)
      else if (event === 'done') on.onDone(d.message as ChatMessage, d.title as string)
      else if (event === 'error') on.onError(d.message as string)
    }
  }
}
