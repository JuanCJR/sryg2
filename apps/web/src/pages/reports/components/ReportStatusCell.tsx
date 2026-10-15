import type { ReportStatus } from '@sryg/types'
import { Lamp } from '../../../common/components'
import { lampOf, STATUS_LABELS } from '../utils/report-view'
import styles from './ReportStatusCell.module.css'

/** Lamp plus text, never color alone (DS-05). */
export function ReportStatusCell({ status }: { status: ReportStatus }) {
  return (
    <span className={styles.status}>
      <Lamp status={lampOf(status)} size="sm" />
      <span className={styles.label}>{STATUS_LABELS[status]}</span>
    </span>
  )
}
