import { createContext } from 'react'

export type ThemeMode = 'day' | 'night' | 'system'
export type ResolvedTheme = 'day' | 'night'

export interface ThemeContextValue {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
