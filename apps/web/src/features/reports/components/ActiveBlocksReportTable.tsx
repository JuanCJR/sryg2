import { Link } from 'react-router'
import type { ActiveBlockReportRow } from '@sryg/types'
import { personnelDetail } from '../../../app/routes'
import { BLOCK_TYPE_LABELS, formatDateTime } from '../domain/report-view'
import styles from './ReportTable.module.css'

/** Report 3: one row per unresolved block, newest first. */
export function ActiveBlocksReportTable({ rows }: { rows: ActiveBlockReportRow[] }) {
  return (
    <div className={styles.scroller}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Cédula</th>
            <th scope="col">Titular</th>
            <th scope="col">Tipo</th>
            <th scope="col">Motivo</th>
            <th scope="col">Registrado</th>
            <th scope="col">Registrado por</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.blockId}>
              <td className={styles.mono}>{row.cedula}</td>
              <td>
                <Link to={personnelDetail(row.personalId)} className={styles.name}>
                  {row.fullName}
                </Link>
              </td>
              <td>{BLOCK_TYPE_LABELS[row.type]}</td>
              <td>{row.reason}</td>
              <td className={styles.mono}>{formatDateTime(row.createdAt)}</td>
              <td>{row.createdByName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
