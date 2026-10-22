import { useState, type FormEvent, type KeyboardEvent, type Ref } from 'react'

const MAX_CHARS = 32_000

interface ComposerProps {
  name: string
  streaming: boolean
  onSend: (text: string) => void
  onStop: () => void
  inputRef?: Ref<HTMLTextAreaElement>
}

export function Composer({ name, streaming, onSend, onStop, inputRef }: ComposerProps) {
  const [text, setText] = useState('')
  const canSend = !streaming && text.trim().length > 0

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!canSend) return
    onSend(text.trim())
    setText('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter (or an IME composition) inserts a newline.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e)
  }

  return (
    <form onSubmit={submit} className="mc-panel flex items-end gap-2 p-2">
      <label className="flex-1">
        <span className="sr-only">Message {name}</span>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MAX_CHARS}
          rows={1}
          placeholder={`Message ${name}`}
          className="mc-slot block max-h-48 min-h-11 w-full resize-none px-3 py-2.5 text-white [field-sizing:content] placeholder:text-white/60 focus-visible:outline-2 focus-visible:outline-accent"
        />
      </label>
      {streaming ? (
        <button type="button" onClick={onStop} className="mc-button h-11 px-4 font-pixel">
          Stop
        </button>
      ) : (
        <button type="submit" disabled={!canSend} className="mc-button h-11 px-4 font-pixel disabled:opacity-50">
          Send
        </button>
      )}
    </form>
  )
}
