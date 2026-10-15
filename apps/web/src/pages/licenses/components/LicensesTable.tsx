import { Link } from 'react-router'
import { StatusBadge, type CredentialStatus } from '../../../common/components'
import clsx from '../../../common/utils/clsx'
import styles from './LicensesTable.module.css'

export interface LicenseListRow {
  id: string
  href: string
  estado: CredentialStatus
  cedula: string
  nombre: string
  tipo: string
  numero: string
  emitidaLabel: string
  venceLabel: string
}

export interface LicensesTableProps {
  rows: LicenseListRow[]
}

/**
 * The license query's results: dense rows linking to the holder's Expediente (stacked at phone
 * width). Columns follow the UI convention: Número, Solicitante, Tipo, Emitida, Vence, Estado.
 */
export function LicensesTable({ rows }: LicensesTableProps) {
  return (
    <div className={styles.table}>
      <div className={styles.headerRow} aria-hidden="true">
        <span className={styles.headerCell}>Número</span>
        <span className={styles.headerCell}>Solicitante</span>
        <span className={clsx(styles.headerCell, styles.colTipo)}>Tipo</span>
        <span className={clsx(styles.headerCell, styles.colEmitida)}>Emitida</span>
        <span className={styles.headerCell}>Vence</span>
        <span className={styles.headerCell}>Estado</span>
      </div>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.id}>
            <Link to={row.href} className={styles.row}>
              <span className={clsx(styles.figure, styles.numero)}>{row.numero}</span>
              <span className={styles.solicitante}>
                <span className={styles.nombre}>{row.nombre}</span>
                <span className={styles.cedula}>{row.cedula}</span>
              </span>
              <span className={clsx(styles.tipo, styles.colTipo)}>{row.tipo}</span>
              <span className={clsx(styles.figure, styles.colEmitida)}>{row.emitidaLabel}</span>
              <span className={clsx(styles.figure, styles.vence)}>{row.venceLabel}</span>
              <span className={styles.estado}>
                <StatusBadge status={row.estado} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
