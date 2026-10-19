import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

/** Also read by the pre-paint script in index.html; keep the two in sync. */
export const THEME_KEY = 'weevil:theme'

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

const systemTheme = (): Theme =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

/** Light/dark theme: an explicit choice wins, otherwise follow the system. */
export function useTheme() {
  const [choice, setChoice] = useState<Theme | null>(readStored)
  const [system, setSystem] = useState<Theme>(systemTheme)
  const theme = choice ?? system

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = () => setSystem(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setChoice(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Storage unavailable (private mode): the choice still applies for this visit.
    }
  }, [theme])

  return { theme, toggle }
}
