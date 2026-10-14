import type { ReactNode } from 'react'
import { AlertTriangle, Info, X } from 'lucide-react'
import { IconButton } from '../../atoms/IconButton/IconButton'
import clsx from '../../utils/clsx'
import styles from './Notice.module.css'

export type NoticeTone = 'warning' | 'caution' | 'info'

const TONE_ICON = {
  warning: AlertTriangle,
  caution: AlertTriangle,
  info: Info,
} as const

export interface NoticeProps {
  tone: NoticeTone
  title: string
  children: ReactNode
  action?: ReactNode
  /** Persistent by default — an open block does not disappear on its own. */
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

export function Notice({ tone, title, children, action, dismissible = false, onDismiss, className }: NoticeProps) {
  const Glyph = TONE_ICON[tone]
  return (
    <div className={clsx(styles.notice, className)} role={tone === 'warning' ? 'alert' : 'status'}>
      <span className={clsx(styles.cell, styles[tone])} aria-hidden="true">
        <Glyph size={14} strokeWidth={2} />
      </span>
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        <div className={styles.message}>{children}</div>
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
      {dismissible ? (
        <IconButton
          icon={X}
          variant="ghost"
          iconSize={16}
          className={styles.dismiss}
          aria-label="Descartar aviso"
          onClick={onDismiss}
        />
      ) : null}
    </div>
  )
}
