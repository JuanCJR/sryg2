import type { AlertKind } from '@sryg/types'
import { Lamp } from '../../../design-system'
import clsx from '../../../lib/clsx'
import styles from './AlertsAnnunciator.module.css'

export interface AlertsAnnunciatorProps {
  /** Totals per kind for the current filters; `null` while loading or after an error (unlit keys). */
  counts: Record<AlertKind, number> | null
  selected: AlertKind | null
  onToggle: (kind: AlertKind) => void
}

// Same state words and lamps as the Listado annunciator (its approved direction), for the two alert kinds.
const KEYS: ReadonlyArray<{ kind: AlertKind; label: string; lamp: 'vencida' | 'proxima' }> = [
  { kind: 'vencida', label: 'Vencida', lamp: 'vencida' },
  { kind: 'proxima', label: 'Próxima a vencer', lamp: 'proxima' },
]

/** Lamp keys with the alert totals; pressing one filters the list to that kind, pressing it again clears it. */
export function AlertsAnnunciator({ counts, selected, onToggle }: AlertsAnnunciatorProps) {
  const unlit = counts === null
  return (
    <div className={styles.grid} role="group" aria-label="Resumen de alertas">
      {KEYS.map(({ kind, label, lamp }) => {
        const isSelected = !unlit && selected === kind
        return (
          <button
            key={kind}
            type="button"
            className={clsx(styles.key, isSelected && styles.selected)}
            aria-pressed={isSelected}
            disabled={unlit}
            onClick={() => onToggle(kind)}
          >
            <Lamp status={unlit ? 'sin-datos' : lamp} size="lg" />
            <span className={styles.label}>{label}</span>
            <span className={styles.total}>{unlit ? '—' : counts[kind]}</span>
          </button>
        )
      })}
    </div>
  )
}
