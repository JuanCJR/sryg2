import PDFDocument from 'pdfkit'
import type { ReportFileMeta } from '../dtos/report-file.dto'
import type { ReportTable } from './report-table'

const MARGIN = 36
const CELL_PADDING = 3
const FONT_SIZE = 7.5

/** A4 landscape listing: title, generation details, and the table with its header repeated per page. */
export class PdfKitReportRenderer {
  readonly format = 'pdf'
  readonly contentType = 'application/pdf'

  render(table: ReportTable, meta: ReportFileMeta): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: MARGIN,
      bufferPages: true,
      info: { Title: table.title, Author: 'SRYG' },
    })
    const done = new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
    })

    doc.font('Helvetica-Bold').fontSize(14).text(table.title)
    doc.moveDown(0.3).font('Helvetica').fontSize(8)
    doc.text(`SRYG · INAC Maracay — Generado: ${meta.generatedAt.slice(0, 16).replace('T', ' ')} UTC`)
    for (const line of meta.details) doc.text(line)
    doc.moveDown(0.6)

    const left = doc.page.margins.left
    const usable = doc.page.width - left - doc.page.margins.right
    const totalWeight = table.columns.reduce((sum, c) => sum + c.weight, 0)
    const widths = table.columns.map((c) => (usable * c.weight) / totalWeight)
    const bottom = () => doc.page.height - doc.page.margins.bottom

    const rowHeight = (cells: string[]) =>
      Math.max(...cells.map((text, i) => doc.heightOfString(text, { width: widths[i]! - 2 * CELL_PADDING }))) +
      2 * CELL_PADDING

    const drawRow = (cells: string[], header: boolean) => {
      doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(FONT_SIZE)
      const height = rowHeight(cells)
      if (doc.y + height > bottom()) {
        doc.addPage()
        if (!header) drawRow(headerCells, true)
        doc.font('Helvetica').fontSize(FONT_SIZE)
      }
      const top = doc.y
      if (header) doc.rect(left, top, usable, height).fill('#e6e6e6').fillColor('#000000')
      let x = left
      cells.forEach((text, i) => {
        doc.text(text, x + CELL_PADDING, top + CELL_PADDING, { width: widths[i]! - 2 * CELL_PADDING })
        x += widths[i]!
      })
      doc
        .moveTo(left, top + height)
        .lineTo(left + usable, top + height)
        .lineWidth(0.4)
        .stroke('#999999')
      doc.x = left
      doc.y = top + height
    }

    const headerCells = table.columns.map((c) => c.header)
    drawRow(headerCells, true)
    if (table.rows.length === 0) doc.moveDown(0.5).font('Helvetica').fontSize(9).text('Sin registros.', left)
    for (const row of table.rows) drawRow(row.map(String), false)

    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i)
      doc.page.margins.bottom = 0
      doc
        .font('Helvetica')
        .fontSize(7)
        .text(`Página ${i + 1} de ${range.count}`, left, doc.page.height - MARGIN / 1.5, {
          width: usable,
          align: 'right',
        })
    }
    doc.end()
    return done
  }
}
