import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type ResolvedTheme, type ThemeMode } from './theme-context'

const STORAGE_KEY = 'sryg.theme'

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'day' || stored === 'night' || stored === 'system') {
      return stored
    }
  } catch {
    /* storage unavailable (private mode, blocked cookies) — fall back to system */
  }
  return 'system'
}

function systemPrefersDay(): boolean {
  return window.matchMedia('(prefers-color-scheme: light)').matches
}

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    return systemPrefersDay() ? 'day' : 'night'
  }
  return mode
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode())
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(mode))

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const applyResolved = () => setResolved(resolve(mode))
    applyResolved()
    if (mode !== 'system') {
      return
    }
    media.addEventListener('change', applyResolved)
    return () => media.removeEventListener('change', applyResolved)
  }, [mode])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved)
    document.documentElement.style.colorScheme = resolved === 'day' ? 'light' : 'dark'
  }, [resolved])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }, [])

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
