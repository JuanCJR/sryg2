import { PENDING_INAC_LABEL } from '@sryg/types'
import { formatDate } from '../utils/report-view'
import styles from './ReportSummary.module.css'

export interface ReportSummaryProps {
  total: number
  today: string
  thresholdDays: number
  thresholdIsPlaceholder: boolean
}

/** Context line: how many rows, the reference day and the near-expiry threshold (D3). */
export function ReportSummary({ total, today, thresholdDays, thresholdIsPlaceholder }: ReportSummaryProps) {
  return (
    <p className={styles.summary}>
      <span className={styles.count}>{total === 1 ? '1 registro' : `${total} registros`}</span>
      <span>Fecha de referencia: {formatDate(today)}</span>
      <span>
        Umbral de próxima a vencer: {thresholdDays} días
        {thresholdIsPlaceholder ? (
          <>
            {' '}
            <span className={styles.pending}>{PENDING_INAC_LABEL}</span>
          </>
        ) : null}
      </span>
    </p>
  )
}
