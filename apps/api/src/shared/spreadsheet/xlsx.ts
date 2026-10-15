import { zip } from './zip'

export type XlsxCell = string | number | null

export interface XlsxColumn {
  header: string
  /** Width in characters; derived from the content when omitted. */
  width?: number
}

/** One worksheet: an optional title and detail lines above a filterable, frozen-header table. */
export interface XlsxSheet {
  name: string
  title?: string
  details?: readonly string[]
  columns: readonly XlsxColumn[]
  rows: readonly (readonly XlsxCell[])[]
}

export interface XlsxOptions {
  createdAt?: Date
  /** Printed in the page footer and stored as the workbook author. */
  author?: string
}

export const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// INAC institutional blue (see docs/ui-conventions.md §5) and the navy-tinted neutral ramp.
const BRAND = 'FF04528A'
const BAND = 'FFF1F4F8'
const RULE = 'FFC9D1DB'
const MUTED = 'FF4D545B'

/** Style ids, in the order of `cellXfs` below. */
const STYLE = { title: 1, detail: 2, header: 3, text: 4, number: 5, textBand: 6, numberBand: 7 } as const

const MIN_WIDTH = 8
const MAX_WIDTH = 60

// Characters XML 1.0 does not allow, even escaped.
// eslint-disable-next-line no-control-regex
const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g

const escapeXml = (text: string) =>
  text
    .replace(INVALID_XML, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

/** 0 → A, 25 → Z, 26 → AA. */
export function columnName(index: number): string {
  let name = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  return name
}

/** Excel refuses sheet names over 31 characters or with any of `[]:*?/\`. */
const sheetName = (name: string) => name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Hoja1'

function cell(ref: string, value: XlsxCell, style: number): string {
  if (value === null || value === '') return `<c r="${ref}" s="${style}"/>`
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}" s="${style}"><v>${value}</v></c>`
  // Inline strings are never evaluated, so a value starting with "=" cannot run as a formula.
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`
}

function widths(sheet: XlsxSheet): number[] {
  return sheet.columns.map((column, i) => {
    if (column.width) return column.width
    const longest = Math.max(
      column.header.length,
      ...sheet.rows.map((row) => {
        const value = row[i]
        // The longest line of a multi-line cell decides its width.
        return value === null || value === undefined ? 0 : Math.max(...String(value).split('\n').map((l) => l.length))
      }),
    )
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, longest + 2))
  })
}

/** The table's header row: after the title, the detail lines and one blank row, if any. */
function headerRowOf(sheet: XlsxSheet): number {
  const above = (sheet.title ? 1 : 0) + (sheet.details?.length ?? 0)
  return above > 0 ? above + 2 : 1
}

function worksheetXml(sheet: XlsxSheet, author: string): string {
  const lastColumn = columnName(Math.max(sheet.columns.length - 1, 0))
  const lines: string[] = []
  const merges: string[] = []
  let row = 1

  if (sheet.title) {
    lines.push(`<row r="${row}" ht="24" customHeight="1">${cell(`A${row}`, sheet.title, STYLE.title)}</row>`)
    if (sheet.columns.length > 1) merges.push(`A${row}:${lastColumn}${row}`)
    row++
  }
  for (const detail of sheet.details ?? []) {
    lines.push(`<row r="${row}">${cell(`A${row}`, detail, STYLE.detail)}</row>`)
    if (sheet.columns.length > 1) merges.push(`A${row}:${lastColumn}${row}`)
    row++
  }
  const headerRow = headerRowOf(sheet)
  row = headerRow
  lines.push(
    `<row r="${row}" ht="30" customHeight="1">${sheet.columns
      .map((c, i) => cell(`${columnName(i)}${row}`, c.header, STYLE.header))
      .join('')}</row>`,
  )
  sheet.rows.forEach((values, index) => {
    row++
    const band = index % 2 === 1
    const cells = sheet.columns.map((_, i) => {
      const value = values[i] ?? null
      const numeric = typeof value === 'number'
      const style = numeric ? (band ? STYLE.numberBand : STYLE.number) : band ? STYLE.textBand : STYLE.text
      return cell(`${columnName(i)}${row}`, value, style)
    })
    lines.push(`<row r="${row}">${cells.join('')}</row>`)
  })

  const range = `A${headerRow}:${lastColumn}${Math.max(row, headerRow)}`
  const cols = widths(sheet)
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('')
  const footer = escapeXml(`&L${author}&RPágina &P de &N`)

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>',
    `<dimension ref="A1:${lastColumn}${Math.max(row, 1)}"/>`,
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0">',
    `<pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/>`,
    `<selection pane="bottomLeft" activeCell="A${headerRow + 1}" sqref="A${headerRow + 1}"/>`,
    '</sheetView></sheetViews>',
    '<sheetFormatPr defaultRowHeight="15"/>',
    `<cols>${cols}</cols>`,
    `<sheetData>${lines.join('')}</sheetData>`,
    `<autoFilter ref="${range}"/>`,
    merges.length > 0
      ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
      : '',
    '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.6" header="0.3" footer="0.3"/>',
    '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>',
    `<headerFooter><oddFooter>${footer}</oddFooter></headerFooter>`,
    '</worksheet>',
  ].join('')
}

const border = (color: string) =>
  `<border><left style="thin"><color rgb="${color}"/></left><right style="thin"><color rgb="${color}"/></right><top style="thin"><color rgb="${color}"/></top><bottom style="thin"><color rgb="${color}"/></bottom><diagonal/></border>`

const STYLES_XML = [
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
  '<fonts count="4">',
  '<font><sz val="10"/><name val="Calibri"/><family val="2"/></font>',
  `<font><b/><sz val="14"/><color rgb="${BRAND}"/><name val="Calibri"/><family val="2"/></font>`,
  `<font><sz val="9"/><color rgb="${MUTED}"/><name val="Calibri"/><family val="2"/></font>`,
  '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>',
  '</fonts>',
  '<fills count="4">',
  '<fill><patternFill patternType="none"/></fill>',
  '<fill><patternFill patternType="gray125"/></fill>',
  `<fill><patternFill patternType="solid"><fgColor rgb="${BRAND}"/><bgColor indexed="64"/></patternFill></fill>`,
  `<fill><patternFill patternType="solid"><fgColor rgb="${BAND}"/><bgColor indexed="64"/></patternFill></fill>`,
  '</fills>',
  `<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border>${border(RULE)}${border(BRAND)}</borders>`,
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
  '<cellXfs count="8">',
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>',
  '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>',
  '<xf numFmtId="0" fontId="3" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>',
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>',
  '<xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>',
  '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>',
  '<xf numFmtId="1" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>',
  '</cellXfs>',
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
  '</styleSheet>',
].join('')

/**
 * A single-sheet Office Open XML workbook (.xlsx) styled like the app: an INAC-blue title, muted
 * detail lines, a blue header row that stays frozen with an autofilter, banded rows and hairline
 * borders. Numbers stay numeric so the spreadsheet can sort and sum them.
 */
export function buildXlsx(sheet: XlsxSheet, { createdAt = new Date(), author = 'SRYG' }: XlsxOptions = {}): Buffer {
  const name = sheetName(sheet.name)
  const iso = `${createdAt.toISOString().slice(0, 19)}Z`
  const headerRow = headerRowOf(sheet)
  const lastColumn = columnName(Math.max(sheet.columns.length - 1, 0))
  const lastRow = headerRow + sheet.rows.length
  const quotedName = `'${name.replaceAll("'", "''")}'`

  const parts: Record<string, string> = {
    '[Content_Types].xml': [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
      '<Default Extension="xml" ContentType="application/xml"/>',
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
      '</Types>',
    ].join(''),
    '_rels/.rels': [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>',
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>',
      '</Relationships>',
    ].join(''),
    'docProps/core.xml': [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
      `<dc:title>${escapeXml(sheet.title ?? name)}</dc:title>`,
      `<dc:creator>${escapeXml(author)}</dc:creator>`,
      `<dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created>`,
      `<dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified>`,
      '</cp:coreProperties>',
    ].join(''),
    'docProps/app.xml': [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>SRYG</Application></Properties>',
    ].join(''),
    'xl/workbook.xml': [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
      `<sheets><sheet name="${escapeXml(name)}" sheetId="1" r:id="rId1"/></sheets>`,
      '<definedNames>',
      `<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${escapeXml(`${quotedName}!$A$${headerRow}:$${lastColumn}$${lastRow}`)}</definedName>`,
      `<definedName name="_xlnm.Print_Titles" localSheetId="0">${escapeXml(`${quotedName}!$${headerRow}:$${headerRow}`)}</definedName>`,
      '</definedNames>',
      '</workbook>',
    ].join(''),
    'xl/_rels/workbook.xml.rels': [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>',
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
      '</Relationships>',
    ].join(''),
    'xl/styles.xml': STYLES_XML,
    'xl/worksheets/sheet1.xml': worksheetXml(sheet, author),
  }

  return zip(
    Object.entries(parts).map(([path, xml]) => ({ path, data: Buffer.from(xml, 'utf8') })),
    createdAt,
  )
}
