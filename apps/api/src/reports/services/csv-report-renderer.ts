import type { ReportTable } from './report-table'

// Byte order mark, so spreadsheets read the file as UTF-8.
const BOM = String.fromCharCode(0xfeff)
// Text that a spreadsheet would run as a formula (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/

function cell(value: string | number): string {
  if (typeof value === 'number') return String(value)
  const text = FORMULA_START.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** RFC 4180 CSV in UTF-8 with a BOM (so spreadsheets read the accents): a header row and the data. */
export class CsvReportRenderer {
  readonly format = 'csv'
  readonly contentType = 'text/csv; charset=utf-8'

  /** The CSV holds only the data: the generation details go in the PDF. */
  render(table: ReportTable): Promise<Buffer> {
    const lines = [table.columns.map((c) => c.header), ...table.rows].map((row) => row.map(cell).join(','))
    return Promise.resolve(Buffer.from(`${BOM}${lines.join('\r\n')}\r\n`, 'utf8'))
  }
}
