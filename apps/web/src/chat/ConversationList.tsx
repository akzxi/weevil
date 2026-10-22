import { useState } from 'react'
import type { Conversation } from '../api/client'

interface ConversationListProps {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

export function ConversationList({ conversations, activeId, onSelect, onNew, onRename, onDelete }: ConversationListProps) {
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <nav aria-label="Conversations" className="flex h-full flex-col gap-3">
      <button type="button" onClick={onNew} className="mc-button h-10 font-pixel">
        New chat
      </button>
      <ul className="-mx-1 flex flex-1 flex-col gap-1 overflow-y-auto px-1" data-testid="conversation-list">
        {conversations.map((c) => {
          const active = c.id === activeId
          return (
            <li key={c.id} data-testid="conversation" className="group relative">
              {editing === c.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const title = new FormData(e.currentTarget).get('title')?.toString().trim()
                    if (title && title !== c.title) onRename(c.id, title)
                    setEditing(null)
                  }}
                >
                  <input
                    name="title"
                    defaultValue={c.title}
                    maxLength={200}
                    autoFocus
                    aria-label="Conversation title"
                    onBlur={(e) => e.currentTarget.form?.requestSubmit()}
                    onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setEditing(null))}
                    className="mc-slot w-full px-2 py-1.5 text-sm text-white focus-visible:outline-2 focus-visible:outline-accent"
                  />
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    aria-current={active || undefined}
                    className={`w-full truncate rounded px-2 py-2 pr-16 text-left text-sm text-inv-ink focus-visible:outline-2 focus-visible:outline-accent ${
                      active ? 'bg-white/35 font-medium' : 'hover:bg-white/20'
                    }`}
                  >
                    {c.title}
                  </button>
                  <div className="absolute top-1/2 right-1 flex -translate-y-1/2 gap-0.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setEditing(c.id)}
                      aria-label={`Rename ${c.title}`}
                      className="grid size-7 place-items-center rounded text-inv-ink hover:bg-white/30"
                    >
                      <svg viewBox="0 0 8 8" className="size-3" shapeRendering="crispEdges" aria-hidden>
                        <path d="M5 0h2v1h1v2H7v1H6v1H5v1H4v1H3v1H0V5h1V4h1V3h1V2h1V1h1z" fill="currentColor" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => confirm(`Delete "${c.title}"? This can't be undone.`) && onDelete(c.id)}
                      aria-label={`Delete ${c.title}`}
                      className="grid size-7 place-items-center rounded text-inv-ink hover:bg-white/30"
                    >
                      <svg viewBox="0 0 8 8" className="size-3" shapeRendering="crispEdges" aria-hidden>
                        <path d="M2 0h4v1h2v1H0V1h2zM1 3h6v5H1zm1 1v3h1V4zm2 0v3h1V4z" fill="currentColor" fillRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </li>
          )
        })}
        {!conversations.length && <li className="px-2 py-3 text-sm text-inv-ink/75">No chats yet.</li>}
      </ul>
    </nav>
  )
}
