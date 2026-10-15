import { describe, expect, it } from 'vitest'
import { defaultFilters, formatDueDate, formatRemaining, toAlertsParams, toSummaryParams } from './alert-view'

const TODAY = new Date('2026-10-15T12:00:00.000Z')

describe('alert view', () => {
  it.each([
    ['2026-10-25', 'Vence en 10 días'],
    ['2026-10-16', 'Vence en 1 día'],
    ['2026-10-15', 'Vence hoy'],
    ['2026-10-14', 'Venció hace 1 día'],
    ['2026-10-12', 'Venció hace 3 días'],
  ])('describes %s relative to today in UTC days', (due, text) => {
    expect(formatRemaining(due, TODAY)).toBe(text)
  })

  it('counts UTC calendar days, like the API recalculation', () => {
    expect(formatRemaining('2026-10-16', new Date('2026-10-15T23:30:00.000Z'))).toBe('Vence en 1 día')
  })

  it('formats the due date as dd/mm/aaaa', () => {
    expect(formatDueDate('2026-01-05')).toBe('05/01/2026')
  })

  it.each([
    ['licencias', 'licencias'],
    ['medicina', 'medicina'],
    ['ambas', ''],
  ] as const)('starts a user of area %s on %j', (area, expected) => {
    expect(defaultFilters(area)).toEqual({
      kind: null,
      credentialKind: '',
      area: expected,
      acknowledgement: 'pendientes',
    })
  })

  it('maps the filters to the list and summary query strings', () => {
    const filters = {
      kind: 'vencida',
      credentialKind: 'licencia',
      area: 'medicina',
      acknowledgement: 'reconocidas',
    } as const
    expect(Object.fromEntries(toAlertsParams(filters, 2, 20))).toEqual({
      kind: 'vencida',
      credentialKind: 'licencia',
      area: 'medicina',
      acknowledged: 'true',
      page: '2',
      pageSize: '20',
    })
    expect(Object.fromEntries(toSummaryParams(filters))).toEqual({
      credentialKind: 'licencia',
      area: 'medicina',
      acknowledged: 'true',
    })
    expect(
      Object.fromEntries(toSummaryParams({ ...filters, credentialKind: '', area: '', acknowledgement: 'todas' })),
    ).toEqual({})
  })
})
