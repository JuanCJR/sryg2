import { createContext } from 'react'

export type ToastTone = 'info' | 'warning' | 'error'

export interface ToastOptions {
  tone: ToastTone
  message: string
}

export interface ToastContextValue {
  show: (options: ToastOptions) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
