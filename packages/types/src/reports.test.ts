import { describe, expect, it } from 'vitest'
import { USER_AREAS } from './enums'
import { canAccessReport, reportExportQuerySchema, reportQuerySchema, REPORTS, worstCredentialStatus } from './reports'

describe('canAccessReport (D10)', () => {
  it('lets Admin and Supervisors of any area read and export the three reports', () => {
    for (const role of ['administrador', 'supervisor'] as const)
      for (const area of USER_AREAS)
        for (const report of REPORTS) {
          expect(canAccessReport(role, area, report, 'read'), `${role}/${area}/${report}`).toBe(true)
          expect(canAccessReport(role, area, report, 'export'), `${role}/${area}/${report}`).toBe(true)
        }
  })

  it('lets Consulta read only report 1 and export none', () => {
    for (const area of USER_AREAS) {
      expect(canAccessReport('consulta', area, 'vencimientos', 'read')).toBe(true)
      expect(canAccessReport('consulta', area, 'estado_consolidado', 'read')).toBe(false)
      expect(canAccessReport('consulta', area, 'bloqueos_activos', 'read')).toBe(false)
      for (const report of REPORTS) expect(canAccessReport('consulta', area, report, 'export')).toBe(false)
    }
  })
})

describe('reportQuerySchema', () => {
  it('defaults the page and drops empty filters', () => {
    expect(reportQuerySchema.parse({ q: '  ', licenseTypeId: '', status: '' })).toEqual({ page: 1, pageSize: 50 })
  })

  it('accepts every filter of D10', () => {
    const query = {
      q: 'Pérez',
      licenseTypeId: '0b6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e11',
      rav60Category: 'piloto_comercial',
      status: 'vencida',
      from: '2026-01-01',
      to: '2026-12-31',
      page: '2',
      pageSize: '10',
    }
    expect(reportQuerySchema.parse(query)).toEqual({ ...query, page: 2, pageSize: 10 })
  })

  it('rejects an unknown category or status, a malformed date and an inverted range', () => {
    expect(reportQuerySchema.safeParse({ rav60Category: 'astronauta' }).success).toBe(false)
    expect(reportQuerySchema.safeParse({ status: 'activa' }).success).toBe(false)
    expect(reportQuerySchema.safeParse({ from: '01/02/2026' }).success).toBe(false)
    expect(reportQuerySchema.safeParse({ licenseTypeId: 'x' }).success).toBe(false)
    expect(reportQuerySchema.safeParse({ from: '2026-05-02', to: '2026-05-01' }).success).toBe(false)
  })

  it('requires csv or pdf to export', () => {
    expect(reportExportQuerySchema.parse({ format: 'pdf' })).toMatchObject({ format: 'pdf' })
    expect(reportExportQuerySchema.safeParse({}).success).toBe(false)
    expect(reportExportQuerySchema.safeParse({ format: 'xlsx' }).success).toBe(false)
  })
})

describe('worstCredentialStatus', () => {
  it('ranks bloqueada over vencida over proxima_a_vencer over vigente, and is null without credentials', () => {
    expect(worstCredentialStatus([])).toBeNull()
    expect(worstCredentialStatus(['vigente', 'proxima_a_vencer'])).toBe('proxima_a_vencer')
    expect(worstCredentialStatus(['proxima_a_vencer', 'vencida', 'vigente'])).toBe('vencida')
    expect(worstCredentialStatus(['vencida', 'bloqueada'])).toBe('bloqueada')
  })
})
