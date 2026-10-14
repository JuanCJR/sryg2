import { Link } from 'react-router'
import type { ConsolidatedReportRow } from '@sryg/types'
import { personnelDetail } from '../../../app/routes'
import { formatDate, RAV67_LABELS, STATUS_LABELS } from '../domain/report-view'
import { ReportStatusCell } from './ReportStatusCell'
import styles from './ReportTable.module.css'

/** Report 2: one row per person with the worst status of their current credentials. */
export function ConsolidatedReportTable({ rows }: { rows: ConsolidatedReportRow[] }) {
  return (
    <div className={styles.scroller}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Estado</th>
            <th scope="col">Cédula</th>
            <th scope="col">Titular</th>
            <th scope="col">Licencias</th>
            <th scope="col" className={styles.numeric}>
              Habilitaciones
              <br />
              venc. / próx. / total
            </th>
            <th scope="col">Certificado médico</th>
            <th scope="col" className={styles.numeric}>
              Bloqueos
            </th>
            <th scope="col">Próximo vencimiento</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.personalId}>
              <td>
                <ReportStatusCell status={row.status} />
              </td>
              <td className={styles.mono}>{row.cedula}</td>
              <td>
                <Link to={personnelDetail(row.personalId)} className={styles.name}>
                  {row.fullName}
                </Link>
              </td>
              <td>
                {row.licenses.length === 0 ? (
                  <span className={styles.muted}>—</span>
                ) : (
                  <ul className={styles.list}>
                    {row.licenses.map((license) => (
                      <li key={`${license.licenseTypeName}:${license.number}`}>
                        {license.licenseTypeName}{' '}
                        <span className={styles.muted}>
                          ({license.expiryDate ? formatDate(license.expiryDate) : 'sin vencimiento'} ·{' '}
                          {STATUS_LABELS[license.status]})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td className={`${styles.mono} ${styles.numeric}`}>
                {`${row.ratings.expired} / ${row.ratings.nearExpiry} / ${row.ratings.total}`}
              </td>
              <td>
                {row.medical ? (
                  <>
                    {RAV67_LABELS[row.medical.rav67Class]}{' '}
                    <span className={styles.muted}>
                      ({formatDate(row.medical.expiryDate)} · {STATUS_LABELS[row.medical.status]})
                    </span>
                  </>
                ) : (
                  <span className={styles.muted}>—</span>
                )}
              </td>
              <td className={`${styles.mono} ${styles.numeric}`}>{row.activeBlocks}</td>
              <td className={styles.mono}>{row.nextExpiryDate ? formatDate(row.nextExpiryDate) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
