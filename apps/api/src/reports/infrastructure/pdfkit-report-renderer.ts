import PDFDocument from 'pdfkit'
import { inacLogo, LEGAL_NOTICE, PDF_COLORS as C, useBrandFonts } from '../../shared/pdf/brand'
import type { ReportFileMeta, ReportFileRenderer } from '../domain/report-file-renderer'
import type { ReportTable } from '../domain/report-table'

const MARGIN = 32
const CELL_PADDING = 4
const FONT_SIZE = 7.5
const HEADER_SIZE = 6.5
const FOOTER_HEIGHT = 22
const LAMP = 5

/** The status lamp of each label, as in the app: hue only for a verdict, an outline when in order. */
const LAMPS: Record<string, { fill: string | null; stroke: string }> = {
  Vencida: { fill: C.red, stroke: C.red },
  Bloqueada: { fill: C.red, stroke: C.red },
  'Próxima a vencer': { fill: C.amber, stroke: C.amber },
  Vigente: { fill: null, stroke: C.unlit },
  'Sin credenciales': { fill: null, stroke: C.rule },
}

/** `YYYY-MM-DD HH:mm` (UTC). */
const stamp = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`

/**
 * A4 landscape listing in the app's visual language: the INAC logo and an INAC-blue title, the
 * generation details in a light panel, a blue header row repeated on every page, banded rows with
 * hairline rules, status lamps next to each state, and a footer with the legal notice and paging.
 */
export class PdfKitReportRenderer implements ReportFileRenderer {
  readonly format = 'pdf'
  readonly contentType = 'application/pdf'

  render(table: ReportTable, meta: ReportFileMeta): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: MARGIN, left: MARGIN, right: MARGIN, bottom: MARGIN + FOOTER_HEIGHT },
      bufferPages: true,
      info: { Title: table.title, Author: 'SRYG · INAC Maracay' },
    })
    const done = new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
    })

    const font = useBrandFonts(doc)
    const logo = inacLogo()
    const left = doc.page.margins.left
    const usable = doc.page.width - left - doc.page.margins.right
    const bottom = () => doc.page.height - doc.page.margins.bottom

    // Heading: logo, eyebrow, title and a brand rule.
    const top = doc.page.margins.top
    const logoHeight = 34
    const logoWidth = logo ? (logoHeight * 229) / 111 : 0
    if (logo) doc.image(logo, left, top, { height: logoHeight })
    const textLeft = left + (logo ? logoWidth + 12 : 0)
    doc
      .font(font.bold)
      .fontSize(7)
      .fillColor(C.muted)
      .text('SRYG · INAC MARACAY · REPORTE', textLeft, top + 2, { characterSpacing: 0.6 })
    doc
      .font(font.bold)
      .fontSize(15)
      .fillColor(C.brand)
      .text(table.title, textLeft, top + 12, { width: usable - (textLeft - left) })
    doc
      .font(font.regular)
      .fontSize(7.5)
      .fillColor(C.muted)
      .text(`Generado: ${stamp(meta.generatedAt)} UTC`, left, top + 4, { width: usable, align: 'right' })
    const ruleY = Math.max(doc.y, top + logoHeight) + 8
    doc.rect(left, ruleY, usable, 2).fill(C.brand)

    // Generation details in a light panel, two columns.
    const details = meta.details
    const half = Math.ceil(details.length / 2)
    const columns = [details.slice(0, half), details.slice(half)]
    doc.font(font.regular).fontSize(7.5)
    const lineHeight = doc.currentLineHeight(true) + 2
    const panelHeight = Math.max(1, half) * lineHeight + 12
    const panelY = ruleY + 10
    doc.rect(left, panelY, usable, panelHeight).fill(C.band)
    columns.forEach((lines, col) => {
      lines.forEach((line, i) => {
        doc
          .fillColor(C.ink)
          .text(line, left + 10 + col * (usable / 2), panelY + 6 + i * lineHeight, { width: usable / 2 - 20 })
      })
    })
    doc.x = left
    doc.y = panelY + panelHeight + 12

    // The table.
    const totalWeight = table.columns.reduce((sum, c) => sum + c.weight, 0)
    const widths = table.columns.map((c) => (usable * c.weight) / totalWeight)
    const statusColumn = table.columns.findIndex((c) => c.header === 'Estado')
    const headerCells = table.columns.map((c) => c.header.toUpperCase())

    const cellWidth = (i: number) => widths[i]! - 2 * CELL_PADDING - (i === statusColumn ? LAMP + 4 : 0)
    const rowHeight = (cells: string[], size: number, bold: boolean) => {
      doc.font(bold ? font.bold : font.regular).fontSize(size)
      return Math.max(...cells.map((text, i) => doc.heightOfString(text, { width: cellWidth(i) }))) + 2 * CELL_PADDING
    }

    const drawHeader = () => {
      const height = rowHeight(headerCells, HEADER_SIZE, true) + 2
      const y = doc.y
      doc.rect(left, y, usable, height).fill(C.brand)
      let x = left
      headerCells.forEach((text, i) => {
        doc
          .font(font.bold)
          .fontSize(HEADER_SIZE)
          .fillColor(C.white)
          .text(text, x + CELL_PADDING, y + CELL_PADDING + 1, {
            width: widths[i]! - 2 * CELL_PADDING,
            characterSpacing: 0.3,
          })
        x += widths[i]!
      })
      doc.x = left
      doc.y = y + height
    }

    const drawRow = (values: Array<string | number>, index: number) => {
      const cells = values.map(String)
      const height = rowHeight(cells, FONT_SIZE, false)
      if (doc.y + height > bottom()) {
        doc.addPage()
        drawHeader()
      }
      const y = doc.y
      if (index % 2 === 1) doc.rect(left, y, usable, height).fill(C.band)
      let x = left
      cells.forEach((text, i) => {
        let textX = x + CELL_PADDING
        if (i === statusColumn) {
          const lamp = LAMPS[text]
          if (lamp) {
            const lampY = y + CELL_PADDING + 1.5
            doc.lineWidth(0.8).rect(textX, lampY, LAMP, LAMP)
            if (lamp.fill) doc.fillAndStroke(lamp.fill, lamp.stroke)
            else doc.stroke(lamp.stroke)
          }
          textX += LAMP + 4
        }
        doc
          .font(i === 0 || i === statusColumn ? font.bold : font.regular)
          .fontSize(FONT_SIZE)
          .fillColor(C.ink)
          .text(text, textX, y + CELL_PADDING, {
            width: cellWidth(i),
            align: typeof values[i] === 'number' ? 'right' : 'left',
          })
        x += widths[i]!
      })
      doc
        .moveTo(left, y + height)
        .lineTo(left + usable, y + height)
        .lineWidth(0.4)
        .stroke(C.rule)
      doc.x = left
      doc.y = y + height
    }

    drawHeader()
    if (table.rows.length === 0) {
      doc
        .moveDown(0.8)
        .font(font.regular)
        .fontSize(9)
        .fillColor(C.muted)
        .text('Sin registros para estos filtros.', left)
    }
    table.rows.forEach(drawRow)

    // Footer on every page.
    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i)
      const y = doc.page.height - MARGIN - 10
      doc.page.margins.bottom = 0
      doc
        .moveTo(left, y - 6)
        .lineTo(left + usable, y - 6)
        .lineWidth(0.4)
        .stroke(C.rule)
      doc
        .font(font.regular)
        .fontSize(6.5)
        .fillColor(C.muted)
        .text(`SRYG · INAC Maracay — ${LEGAL_NOTICE}`, left, y, { width: usable * 0.8, lineBreak: false })
      doc.text(`Página ${i + 1} de ${range.count}`, left, y, { width: usable, align: 'right', lineBreak: false })
    }
    doc.end()
    return done
  }
}
