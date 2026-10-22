import { motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, streamChat, type Conversation } from '../api/client'
import type { CharacterDef } from '../characters/types'
import { PixelSprite } from '../pixel/PixelSprite'
import { wornItems } from '../state/inventory'
import { loadoutOf, useWeevil } from '../state/store'
import { Composer } from './Composer'
import { ConversationList } from './ConversationList'
import { toUi, type UiMessage } from './messages'
import { MessageView } from './MessageView'

const OFFLINE = "Can't reach the weevil API. Start it with `npm run dev:api` (and `npm run db:up`)."

/** Move a conversation to the top of the list with its latest title. */
const bump = (list: Conversation[], id: string, title: string) => {
  const c = list.find((x) => x.id === id)
  return c ? [{ ...c, title, updated_at: new Date().toISOString() }, ...list.filter((x) => x.id !== id)] : list
}

export function ChatScreen({ character }: { character: CharacterDef }) {
  const closeChat = useWeevil((s) => s.closeChat)
  const worn = useWeevil((s) => loadoutOf(s.loadouts, character.id).worn)
  const items = useMemo(() => wornItems({ skills: [], mcps: [], worn }), [worn])

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const select = useCallback(async (id: string | null) => {
    abortRef.current?.abort()
    setActiveId(id)
    setSidebarOpen(false)
    stickToBottom.current = true
    if (!id) return setMessages([])
    try {
      setMessages((await api.listMessages(id)).map(toUi))
    } catch {
      setNotice(OFFLINE)
    }
  }, [])

  useEffect(() => {
    let live = true
    api
      .listConversations(character.id)
      .then((list) => {
        if (!live) return
        setConversations(list)
        void select(list[0]?.id ?? null)
      })
      .catch(() => live && setNotice(OFFLINE))
    inputRef.current?.focus()
    return () => {
      live = false
      abortRef.current?.abort()
    }
  }, [character.id, select])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeChat()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeChat])

  useEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const send = async (text: string) => {
    setNotice(null)
    let id = activeId
    if (!id) {
      try {
        const created = await api.createConversation(character.id)
        setConversations((list) => [created, ...list])
        setActiveId((id = created.id))
      } catch {
        return setNotice(OFFLINE)
      }
    }
    const conversationId = id
    const stamp = Date.now()
    const userKey = `u-${stamp}`
    const replyKey = `a-${stamp}`
    const blank = { thinking: '', stop_reason: null }
    stickToBottom.current = true
    setMessages((m) => [
      ...m,
      { key: userKey, role: 'user', text, ...blank },
      { key: replyKey, role: 'assistant', text: '', pending: true, ...blank },
    ])
    const patchReply = (fn: (m: UiMessage) => UiMessage) =>
      setMessages((list) => list.map((m) => (m.key === replyKey ? fn(m) : m)))

    const controller = new AbortController()
    abortRef.current = controller
    setStreaming(true)
    try {
      await streamChat(
        conversationId,
        text,
        {
          onUser: (saved) => setMessages((list) => list.map((m) => (m.key === userKey ? toUi(saved) : m))),
          onThinking: (t) => patchReply((m) => ({ ...m, thinking: m.thinking + t })),
          onText: (t) => patchReply((m) => ({ ...m, text: m.text + t })),
          onDone: (saved, title) => {
            patchReply(() => toUi(saved))
            setConversations((list) => bump(list, conversationId, title))
          },
          onError: (error) => patchReply((m) => ({ ...m, pending: false, error })),
        },
        controller.signal,
      )
    } catch {
      patchReply((m) =>
        controller.signal.aborted
          ? { ...m, pending: false, stopped: true }
          : { ...m, pending: false, error: 'Lost the connection to the weevil API mid-reply.' },
      )
    } finally {
      // A stream that closed without `done` or `error` ended early.
      patchReply((m) => (m.pending ? { ...m, pending: false, error: 'The reply ended unexpectedly.' } : m))
      if (abortRef.current === controller) abortRef.current = null
      setStreaming(false)
    }
  }

  const rename = async (id: string, title: string) => {
    try {
      const saved = await api.renameConversation(id, title)
      setConversations((list) => list.map((c) => (c.id === id ? saved : c)))
    } catch {
      setNotice(OFFLINE)
    }
  }

  const remove = async (id: string) => {
    try {
      await api.deleteConversation(id)
    } catch {
      return setNotice(OFFLINE)
    }
    const rest = conversations.filter((c) => c.id !== id)
    setConversations(rest)
    if (id === activeId) void select(rest[0]?.id ?? null)
  }

  const replying = messages.some((m) => m.pending && m.text)

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Chat with ${character.name}`}
      className="world fixed inset-0 z-[38] flex flex-col md:grid md:grid-cols-[17rem_minmax(0,1fr)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <aside
        className={`mc-panel fixed inset-y-2 left-2 z-10 w-72 p-3 transition-transform md:static md:m-3 md:w-auto md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-[110%]'
        }`}
      >
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => void select(id)}
          onNew={() => void select(null)}
          onRename={(id, title) => void rename(id, title)}
          onDelete={(id) => void remove(id)}
        />
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 px-4 pt-4 pb-2 pr-24 md:px-8 md:pt-6">
          <button type="button" onClick={closeChat} className="mc-button h-9 px-3 font-pixel text-sm">
            Back
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-expanded={sidebarOpen}
            className="mc-button h-9 px-3 font-pixel text-sm md:hidden"
          >
            Chats
          </button>
          <div className="ml-1 h-10 w-15 shrink-0">
            <PixelSprite sprite={character.sprite} mode={replying ? 'talk' : 'idle'} worn={items} className="size-full" />
          </div>
          <div className="min-w-0">
            <h2 className="font-pixel text-xl leading-tight">{character.name}</h2>
            <p className="truncate text-xs text-ink-muted">
              {character.company} · {character.model}
            </p>
          </div>
        </header>

        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget
            stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
          }}
          className="min-h-0 flex-1 overflow-y-auto px-4 md:px-8"
          data-testid="message-list"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-6 py-6">
            {messages.length === 0 && !notice && (
              <p className="py-16 text-center text-ink-muted">Say hello to {character.name}.</p>
            )}
            {messages.map((m) => (
              <MessageView key={m.key} message={m} name={character.name} />
            ))}
            {notice && (
              <p role="alert" className="rounded-lg border border-panel-border bg-panel px-4 py-3 text-sm">
                {notice}
              </p>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 pb-4 md:px-8 md:pb-6">
          <Composer
            name={character.name}
            streaming={streaming}
            onSend={(t) => void send(t)}
            onStop={() => abortRef.current?.abort()}
            inputRef={inputRef}
          />
        </div>
      </main>
    </motion.div>
  )
}
