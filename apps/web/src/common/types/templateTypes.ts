import type { ReactNode } from 'react'

/** Shared shape for every template's `error` status — never a raw string, so a retry action is always optional but structured. */
export interface TemplateErrorContent {
  title: string
  message: ReactNode
  onRetry?: () => void
  /** @default 'Reintentar' */
  retryLabel?: string
}

/** Shared shape for every template's `empty` status (List and Dashboard). */
export interface TemplateEmptyContent {
  /** 'no-data': nothing exists yet. 'no-results': the current filter matches nothing. */
  reason: 'no-data' | 'no-results'
  title: string
  message: ReactNode
  action?: ReactNode
}
