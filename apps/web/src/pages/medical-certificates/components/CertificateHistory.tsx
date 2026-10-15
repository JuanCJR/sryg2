import type { MedicalCertificateHistoryEntryDto } from '@sryg/types'
import { Pagination } from '../../../common/components'
import { useClientPagination } from '../../../common/hooks/useClientPagination'
import { formatDateTime } from '../utils/dates'
import { historyActionLabel } from '../utils/labels'
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
  return <HistoryEntries entries={state.entries} />
}

/** The audit trail grows with every renewal: it pages on the client, 10 entries at a time. */
function HistoryEntries({ entries }: { entries: MedicalCertificateHistoryEntryDto[] }) {
  const pagination = useClientPagination(entries)
  return (
    <div className={styles.paged}>
      <ul className={styles.list} aria-label="Historial del certificado">
        {pagination.pageItems.map((entry) => (
          <li key={entry.id} className={styles.entry}>
            <span className={styles.action}>{historyActionLabel(entry.action)}</span>
            <span className={styles.when}>{formatDateTime(entry.occurredAt)}</span>
            <span className={styles.who}>{entry.actor?.fullName ?? 'Sistema'}</span>
          </li>
        ))}
      </ul>
      <Pagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        onPageChange={pagination.setPage}
        total={pagination.total}
        pageSize={pagination.pageSize}
      />
    </div>
  )
}
