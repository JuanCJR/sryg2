import { describe, expect, it } from 'vitest'
import { readXlsxRows, unzip } from '../../test/read-xlsx'
import { buildXlsx, columnName } from './xlsx'

const sheet = {
  name: 'Bloqueos: activos/2026',
  title: 'Bloqueos activos',
  details: ['Generado: 2026-10-14 15:30 UTC', 'Registros: 2'],
  columns: [{ header: 'Cédula' }, { header: 'Nombre' }, { header: 'Días' }],
  rows: [
    ['V-12345678', 'Pérez, "Ana" & <María>', 12],
    ['=HYPERLINK("x")', 'Línea 1\nLínea 2', -3],
  ],
}

describe('buildXlsx', () => {
  it('names columns like a spreadsheet', () => {
    expect([0, 25, 26, 51, 701, 702].map(columnName)).toEqual(['A', 'Z', 'AA', 'AZ', 'ZZ', 'AAA'])
  })

  it('packages a workbook with the parts Excel needs', () => {
    const parts = unzip(buildXlsx(sheet))
    expect([...parts.keys()].sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'docProps/app.xml',
      'docProps/core.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
    ])
    // Excel rejects sheet names with ":" or "/".
    expect(parts.get('xl/workbook.xml')!.toString()).toContain('<sheet name="Bloqueos  activos 2026"')
  })

  it('writes the title and details above the table, text escaped and numbers numeric', () => {
    expect(readXlsxRows(buildXlsx(sheet))).toEqual([
      ['Bloqueos activos'],
      ['Generado: 2026-10-14 15:30 UTC'],
      ['Registros: 2'],
      ['Cédula', 'Nombre', 'Días'],
      ['V-12345678', 'Pérez, "Ana" & <María>', 12],
      ['=HYPERLINK("x")', 'Línea 1\nLínea 2', -3],
    ])
  })

  it('never stores text as a formula, and freezes and filters the header row', () => {
    const xml = unzip(buildXlsx(sheet)).get('xl/worksheets/sheet1.xml')!.toString()
    expect(xml).not.toContain('<f>')
    expect(xml).toContain('<pane ySplit="5" topLeftCell="A6"')
    expect(xml).toContain('<autoFilter ref="A5:C7"/>')
    expect(xml).toContain('<mergeCell ref="A1:C1"/>')
  })

  it('starts the table on the first row when there is no heading block', () => {
    const file = buildXlsx({ name: 'x', columns: [{ header: 'a' }], rows: [] })
    expect(readXlsxRows(file)).toEqual([['a']])
    expect(unzip(file).get('xl/worksheets/sheet1.xml')!.toString()).toContain('<autoFilter ref="A1:A1"/>')
  })
})
