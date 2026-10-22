import { motion } from 'motion/react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { UiMessage } from './messages'

function Dots() {
  return (
    <span className="inline-flex gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 bg-ink-muted"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  )
}

export function MessageView({ message, name }: { message: UiMessage; name: string }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div data-testid="user-message" className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent-soft px-4 py-2.5 whitespace-pre-wrap">
          {message.text}
        </div>
      </div>
    )
  }

  const { text, thinking, pending, stop_reason, stopped, error } = message
  const thinkingNow = pending && !text
  return (
    <article className="flex flex-col gap-2" aria-busy={pending || undefined}>
      <div className="font-pixel text-sm text-ink-muted">{name}</div>
      {thinking && (
        <details className="group rounded-lg border border-panel-border bg-panel/60 px-3 py-2 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 text-ink-muted select-none">
            {thinkingNow ? (
              <>
                Thinking <Dots />
              </>
            ) : (
              'Thought process'
            )}
          </summary>
          <div className="mt-2 whitespace-pre-wrap text-ink-muted">{thinking}</div>
        </details>
      )}
      {pending && !text && !thinking && (
        <div className="py-1" role="status" aria-label={`${name} is thinking`}>
          <Dots />
        </div>
      )}
      {text && (
        <div className="prose-chat">
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{ a: (props) => <a {...props} target="_blank" rel="noreferrer noopener" /> }}
          >
            {text}
          </Markdown>
        </div>
      )}
      {stop_reason === 'refusal' && (
        <p className="text-sm text-ink-muted">{name} declined to answer this one. Try rephrasing your message.</p>
      )}
      {stop_reason === 'max_tokens' && (
        <p className="text-sm text-ink-muted">This reply hit the length limit and was cut off.</p>
      )}
      {stopped && <p className="text-sm text-ink-muted">Stopped. This partial reply isn't saved.</p>}
      {error && (
        <p role="alert" className="rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 text-sm">
          {error}
        </p>
      )}
    </article>
  )
}
