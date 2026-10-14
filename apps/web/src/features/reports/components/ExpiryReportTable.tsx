import { Link } from 'react-router'
import type { ExpiryReportRow } from '@sryg/types'
import { personnelDetail } from '../../../app/routes'
import { formatDate, formatRemaining, KIND_LABELS, RAV60_LABELS } from '../domain/report-view'
import { ReportStatusCell } from './ReportStatusCell'
import styles from './ReportTable.module.css'

/** Report 1: one row per expired or near-expiry credential. */
export function ExpiryReportTable({ rows }: { rows: ExpiryReportRow[] }) {
  return (
    <div className={styles.scroller}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Estado</th>
            <th scope="col">Cédula</th>
            <th scope="col">Titular</th>
            <th scope="col">Credencial</th>
            <th scope="col">Descripción</th>
            <th scope="col">Categoría RAV 60</th>
            <th scope="col">Vencimiento</th>
            <th scope="col" className={styles.numeric}>
              Días restantes
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.credentialKind}:${row.credentialId}`}>
              <td>
                <ReportStatusCell status={row.status} />
              </td>
              <td className={styles.mono}>{row.cedula}</td>
              <td>
                <Link to={personnelDetail(row.personalId)} className={styles.name}>
                  {row.fullName}
                </Link>
              </td>
              <td>{KIND_LABELS[row.credentialKind]}</td>
              <td>
                {row.description}
                {row.licenseTypeName && row.credentialKind !== 'licencia' ? (
                  <div className={styles.muted}>{row.licenseTypeName}</div>
                ) : null}
              </td>
              <td>{row.rav60Category ? RAV60_LABELS[row.rav60Category] : <span className={styles.muted}>—</span>}</td>
              <td className={styles.mono}>{formatDate(row.expiryDate)}</td>
              <td className={`${styles.mono} ${styles.numeric}`}>{formatRemaining(row.daysRemaining)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
