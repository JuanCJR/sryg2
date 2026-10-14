import { useId } from 'react'
import type { ReportId } from '@sryg/types'
import { REPORT_LABELS } from '../domain/report-view'
import styles from './ReportPicker.module.css'

export interface ReportPickerProps {
  reports: ReportId[]
  value: ReportId
  onChange: (report: ReportId) => void
}

/** Segmented choice of report: native radios, so arrows move between them. */
export function ReportPicker({ reports, value, onChange }: ReportPickerProps) {
  const name = useId()
  return (
    <div role="radiogroup" aria-label="Reporte" className={styles.group}>
      {reports.map((report) => (
        <label key={report} className={styles.option}>
          <input
            type="radio"
            name={name}
            value={report}
            checked={report === value}
            onChange={() => onChange(report)}
            className={styles.input}
          />
          <span className={styles.face}>
            <span className={styles.label}>{REPORT_LABELS[report].label}</span>
            <span className={styles.description}>{REPORT_LABELS[report].description}</span>
          </span>
        </label>
      ))}
    </div>
  )
}
