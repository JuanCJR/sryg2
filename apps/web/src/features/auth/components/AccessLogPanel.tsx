import type { AccessLog, AccessLogEntry } from '@sryg/types'
import { Button, Lamp, Skeleton } from '../../../design-system'
import type { Resource } from '../../../shared/api/useApiResource'
import { formatAccessTime } from '../domain/format-access'
import styles from './AccessLogPanel.module.css'

function EntryList({ title, entries, empty }: { title: string; entries: AccessLogEntry[]; empty: string }) {
  return (
    <div className={styles.column}>
      <h3 className={styles.heading}>{title}</h3>
      {entries.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <ul className={styles.list} aria-label={title}>
          {entries.map((entry) => (
            <li key={`${entry.at}-${entry.ip ?? ''}`} className={styles.row}>
              <span className={styles.time}>{formatAccessTime(entry.at)}</span>
              <span className={styles.ip}>{entry.ip ?? 'IP desconocida'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** D23: the user's latest successful logins and failed attempts (date, time and IP). */
export function AccessLogPanel({ log }: { log: Resource<AccessLog> }) {
  if (log.status === 'loading') {
    return (
      <div className={styles.columns} aria-busy="true">
        <span className="visually-hidden" role="status">
          Cargando registro de accesos
        </span>
        <Skeleton className={styles.skeleton} />
        <Skeleton className={styles.skeleton} />
      </div>
    )
  }
  if (log.status === 'error') {
    return (
      <div className={styles.error} role="alert">
        <Lamp status="sin-datos" />
        <span>No se pudo cargar el registro de accesos.</span>
        <Button variant="secondary" size="sm" onClick={log.retry}>
          Reintentar
        </Button>
      </div>
    )
  }
  return (
    <div className={styles.columns}>
      <EntryList title="Últimos accesos" entries={log.data.successful} empty="No hay accesos registrados." />
      <EntryList title="Intentos fallidos" entries={log.data.failed} empty="No hay intentos fallidos registrados." />
    </div>
  )
}
