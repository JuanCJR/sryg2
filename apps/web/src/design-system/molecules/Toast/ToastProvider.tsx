import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Info, X } from 'lucide-react'
import { IconButton } from '../../atoms/IconButton/IconButton'
import { ToastContext, type ToastOptions } from './toast-context'
import clsx from '../../utils/clsx'
import styles from './Toast.module.css'

interface ToastRecord extends ToastOptions {
  id: number
}

const AUTO_DISMISS_MS = 5000

const TONE_ICON = {
  info: Info,
  warning: AlertTriangle,
  error: AlertTriangle,
} as const

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: number) => void }) {
  const Glyph = TONE_ICON[toast.tone]
  return (
    <div className={styles.toast}>
      <span className={clsx(styles.cell, styles[toast.tone])} aria-hidden="true">
        <Glyph size={12} strokeWidth={2} />
      </span>
      <p className={styles.message}>{toast.message}</p>
      <IconButton
        icon={X}
        variant="ghost"
        iconSize={16}
        aria-label="Descartar mensaje"
        onClick={() => onDismiss(toast.id)}
      />
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++
      setToasts((current) => [...current, { ...options, id }])
      if (options.tone !== 'error') {
        const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
        timers.current.set(id, timer)
      }
    },
    [dismiss],
  )

  useEffect(() => {
    const timersMap = timers.current
    return () => {
      timersMap.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const value = useMemo(() => ({ show }), [show])

  const errorToasts = toasts.filter((toast) => toast.tone === 'error')
  const otherToasts = toasts.filter((toast) => toast.tone !== 'error')

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.viewport}>
        <div aria-live="assertive" className={styles.group}>
          {errorToasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>
        <div aria-live="polite" className={styles.group}>
          {otherToasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}
