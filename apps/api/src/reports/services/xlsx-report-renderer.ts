import { buildXlsx, XLSX_CONTENT_TYPE } from '../../common/spreadsheet/xlsx'
import type { ReportFileMeta } from '../dtos/report-file.dto'
import type { ReportTable } from './report-table'

/** `YYYY-MM-DD HH:mm` (UTC). */
const stamp = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`

/**
 * Excel workbook (.xlsx) of the report: the same title and generation details as the PDF above a
 * filterable table with a frozen header. Days remaining and counts stay numeric.
 */
export class XlsxReportRenderer {
  readonly format = 'xlsx'
  readonly contentType = XLSX_CONTENT_TYPE

  render(table: ReportTable, meta: ReportFileMeta): Promise<Buffer> {
    return Promise.resolve(
      buildXlsx(
        {
          name: 'Reporte',
          title: table.title,
          details: [`SRYG · INAC Maracay — Generado: ${stamp(meta.generatedAt)} UTC`, ...meta.details],
          columns: table.columns.map((c) => ({ header: c.header })),
          rows: table.rows,
        },
        { createdAt: new Date(meta.generatedAt), author: 'SRYG · INAC Maracay' },
      ),
    )
  }
}
