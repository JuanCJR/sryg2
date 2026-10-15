import { Button, Pagination } from '../../../common/components'
import { useClientPagination } from '../../../common/hooks/useClientPagination'
import styles from './LicenseHistoryList.module.css'

export interface LicenseHistoryLine {
  id: number
  what: string
  whenLabel: string
}

export type LicenseHistoryListProps =
  { status: 'loading' } | { status: 'error'; onRetry: () => void } | { status: 'ready'; lines: LicenseHistoryLine[] }

/** The history grows with every trámite: it pages on the client, 10 lines at a time. */
function HistoryLines({ lines }: { lines: LicenseHistoryLine[] }) {
  const pagination = useClientPagination(lines)
  return (
    <>
      <ol className={styles.list}>
        {pagination.pageItems.map((line) => (
          <li key={line.id} className={styles.item}>
            <span className={styles.when}>{line.whenLabel}</span>
            <span>{line.what}</span>
          </li>
        ))}
      </ol>
      <Pagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        onPageChange={pagination.setPage}
        total={pagination.total}
        pageSize={pagination.pageSize}
      />
    </>
  )
}

/** History of one license and its ratings (LIC-06), newest first. */
export function LicenseHistoryList(props: LicenseHistoryListProps) {
  return (
    <div className={styles.wrap} aria-label="Historial de la licencia">
      <span className={styles.label}>Historial</span>
      {props.status === 'loading' ? <p role="status">Cargando historial…</p> : null}
      {props.status === 'error' ? (
        <div role="alert" className={styles.error}>
          <span>No se pudo cargar el historial.</span>
          <Button variant="secondary" size="sm" onClick={props.onRetry}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {props.status === 'ready' ? (
        props.lines.length === 0 ? (
          <p className={styles.muted}>Sin movimientos registrados.</p>
        ) : (
          <HistoryLines lines={props.lines} />
        )
      ) : null}
    </div>
  )
}
