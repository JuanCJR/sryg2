import { TableFrame } from '../../../design-system'
import { Link } from 'react-router'
import type { ExpiryReportRow } from '@sryg/types'
import { personnelDetail } from '../../../app/routes'
import { formatDate, formatRemaining, KIND_LABELS, RAV60_LABELS } from '../domain/report-view'
import { ReportStatusCell } from './ReportStatusCell'
import styles from './ReportTable.module.css'

/**
 * Report 1: one row per expired or near-expiry credential — cédula, holder, credential, its details,
 * the expiry and remaining days, then the status (list convention).
 */
export function ExpiryReportTable({ rows }: { rows: ExpiryReportRow[] }) {
  return (
    <TableFrame>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Cédula</th>
            <th scope="col">Titular</th>
            <th scope="col">Credencial</th>
            <th scope="col">Descripción</th>
            <th scope="col">Categoría RAV 60</th>
            <th scope="col">Vencimiento</th>
            <th scope="col" className={styles.numeric}>
              Días restantes
            </th>
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.credentialKind}:${row.credentialId}`}>
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
              <td>
                <ReportStatusCell status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableFrame>
  )
}
