import { FileSpreadsheet, FileText } from 'lucide-react'
import type { ReportExportFormat } from '@sryg/types'
import { Button } from '../../../common/components'
import styles from './ExportActions.module.css'

export interface ExportActionsProps {
  /** The format being downloaded, if any. */
  pending: ReportExportFormat | null
  disabled?: boolean
  onExport: (format: ReportExportFormat) => void
}

/** Excel and PDF of the whole filtered report; rendered only for roles that can export. */
export function ExportActions({ pending, disabled = false, onExport }: ExportActionsProps) {
  return (
    <div className={styles.actions}>
      <Button
        variant="secondary"
        icon={FileSpreadsheet}
        loading={pending === 'xlsx'}
        disabled={disabled || pending !== null}
        onClick={() => onExport('xlsx')}
      >
        Exportar Excel
      </Button>
      <Button
        variant="secondary"
        icon={FileText}
        loading={pending === 'pdf'}
        disabled={disabled || pending !== null}
        onClick={() => onExport('pdf')}
      >
        Exportar PDF
      </Button>
    </div>
  )
}
