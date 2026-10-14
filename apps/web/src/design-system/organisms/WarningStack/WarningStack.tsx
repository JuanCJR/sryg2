import { useEffect, useState } from 'react'
import { Lamp, type LampStatus } from '../../atoms/Lamp/Lamp'
import clsx from '../../utils/clsx'
import styles from './WarningStack.module.css'

export interface WarningStackMessage {
  id: string
  status: LampStatus
  title: string
  detail: string
  /** Pre-formatted relative figure, e.g. "hace 12 d" or "21 d" — rendered flush right in mono. */
  relativeLabel: string
}

export interface WarningStackProps {
  messages: WarningStackMessage[]
  onSelect: (id: string) => void
  loading?: boolean
  loadingLabel?: string
  emptyLabel?: string
  /** Rows visible before the "+N más" toggle, at non-phone widths. */
  maxVisible?: number
  className?: string
}

function supportsMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

function usePhoneWidth(): boolean {
  const query = '(max-width: 480px)'
  const [matches, setMatches] = useState(() => (supportsMatchMedia() ? window.matchMedia(query).matches : false))

  useEffect(() => {
    if (!supportsMatchMedia()) {
      return
    }
    const mql = window.matchMedia(query)
    const handleChange = () => setMatches(mql.matches)
    handleChange()
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return matches
}

// Data-agnostic: the caller must derive `messages` already sorted by priority.
export function WarningStack({
  messages,
  onSelect,
  loading = false,
  loadingLabel = 'CARGANDO EXPEDIENTE…',
  emptyLabel = 'SIN ALERTAS · Todas las credenciales vigentes.',
  maxVisible = 4,
  className,
}: WarningStackProps) {
  const isPhone = usePhoneWidth()
  const [expanded, setExpanded] = useState(false)

  if (loading) {
    return (
      <div className={clsx(styles.stack, className)} aria-busy="true">
        <div className={styles.quietRow}>
          {/* 'sin-datos', not 'activa' — the status isn't known yet, so it must never read as "confirmed in order". */}
          <Lamp status="sin-datos" size="md" />
          <span className={styles.quietText}>{loadingLabel}</span>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className={clsx(styles.stack, className)}>
        <div className={styles.quietRow}>
          <Lamp status="activa" size="md" />
          <span className={styles.quietText}>{emptyLabel}</span>
        </div>
      </div>
    )
  }

  const defaultVisible = isPhone ? 1 : maxVisible
  const visible = expanded ? messages : messages.slice(0, defaultVisible)
  const hiddenCount = messages.length - visible.length
  const moreLabel = isPhone ? `+${hiddenCount} alertas` : `+${hiddenCount} más`

  return (
    <div className={clsx(styles.stack, className)}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Alertas</span>
        <span className={styles.headerCount}>{messages.length}</span>
      </div>
      <div className={styles.list}>
        {visible.map((message) => (
          <button key={message.id} type="button" className={styles.row} onClick={() => onSelect(message.id)}>
            <Lamp status={message.status} size="md" />
            <span className={styles.rowBody}>
              <span className={styles.rowTitle}>{message.title}</span>
              <span className={styles.rowDetail}>{message.detail}</span>
            </span>
            <span className={styles.rowFigure}>{message.relativeLabel}</span>
          </button>
        ))}
      </div>
      {hiddenCount > 0 || expanded ? (
        <button
          type="button"
          className={styles.more}
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? 'Mostrar menos' : moreLabel}
        </button>
      ) : null}
    </div>
  )
}
