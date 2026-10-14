import type { MedicalCertificateHistoryEntryDto } from '@sryg/types'
import { formatDateTime } from '../domain/dates'
import { historyActionLabel } from '../domain/labels'
import styles from './CertificateHistory.module.css'

export type CertificateHistoryState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; entries: MedicalCertificateHistoryEntryDto[] }

/** The audit trail of one certificate (MED-07): what was done, when and by whom. */
export function CertificateHistory({ state }: { state: CertificateHistoryState }) {
  if (state.status === 'loading') {
    return (
      <p role="status" className={styles.message}>
        Cargando historial…
      </p>
    )
  }
  if (state.status === 'error') {
    return (
      <p role="status" className={styles.message}>
        No se pudo cargar el historial.
      </p>
    )
  }
  if (state.entries.length === 0) {
    return <p className={styles.message}>Sin movimientos registrados.</p>
  }
  return (
    <ul className={styles.list} aria-label="Historial del certificado">
      {state.entries.map((entry) => (
        <li key={entry.id} className={styles.entry}>
          <span className={styles.action}>{historyActionLabel(entry.action)}</span>
          <span className={styles.when}>{formatDateTime(entry.occurredAt)}</span>
          <span className={styles.who}>{entry.actor?.fullName ?? 'Sistema'}</span>
        </li>
      ))}
    </ul>
  )
}
