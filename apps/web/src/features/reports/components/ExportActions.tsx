import { Download } from 'lucide-react'
import type { ReportExportFormat } from '@sryg/types'
import { Button } from '../../../design-system'
import styles from './ExportActions.module.css'

export interface ExportActionsProps {
  /** The format being downloaded, if any. */
  pending: ReportExportFormat | null
  disabled?: boolean
  onExport: (format: ReportExportFormat) => void
}

/** CSV and PDF of the whole filtered report; rendered only for roles that can export. */
export function ExportActions({ pending, disabled = false, onExport }: ExportActionsProps) {
  return (
    <div className={styles.actions}>
      <Button
        variant="secondary"
        icon={Download}
        loading={pending === 'csv'}
        disabled={disabled || pending !== null}
        onClick={() => onExport('csv')}
      >
        Exportar CSV
      </Button>
      <Button
        variant="secondary"
        icon={Download}
        loading={pending === 'pdf'}
        disabled={disabled || pending !== null}
        onClick={() => onExport('pdf')}
      >
        Exportar PDF
      </Button>
    </div>
  )
}
