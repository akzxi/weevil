import type { ChatMessage } from '../api/client'

/** A message as shown on screen: saved messages plus the in-flight reply's local state. */
export interface UiMessage extends Omit<ChatMessage, 'id' | 'created_at'> {
  key: string
  pending?: boolean
  stopped?: boolean
  error?: string
}

export const toUi = (m: ChatMessage): UiMessage => ({ ...m, key: `m-${m.id}` })
