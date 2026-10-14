import type { ReportExportFormat } from '@sryg/types'
import type { ReportTable } from './report-table'

/** Lines printed above the table (generation time, filters, threshold). */
export interface ReportFileMeta {
  generatedAt: string
  details: string[]
}

/** Output port: turns a report table into a downloadable file. */
export interface ReportFileRenderer {
  readonly format: ReportExportFormat
  readonly contentType: string
  render(table: ReportTable, meta: ReportFileMeta): Promise<Buffer>
}
