import { describe, expect, it } from 'vitest'
import { alertAreaOf, alertsQuerySchema, alertsSummaryQuerySchema } from './alerts'

describe('alerts contracts', () => {
  it('parses the list filters, reading acknowledged as a real boolean', () => {
    expect(alertsQuerySchema.parse({ kind: 'vencida', acknowledged: 'false', area: 'medicina' })).toEqual({
      kind: ['vencida'],
      acknowledged: false,
      area: ['medicina'],
      page: 1,
      pageSize: 20,
    })
    expect(alertsQuerySchema.parse({ acknowledged: 'true' }).acknowledged).toBe(true)
    expect(alertsQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 })
  })

  it('rejects unknown kinds, areas and acknowledged values', () => {
    expect(alertsQuerySchema.safeParse({ kind: 'bloqueada' }).success).toBe(false)
    expect(alertsQuerySchema.safeParse({ area: 'ambas' }).success).toBe(false)
    expect(alertsQuerySchema.safeParse({ acknowledged: 'yes' }).success).toBe(false)
    expect(alertsQuerySchema.safeParse({ personalId: 'not-a-uuid' }).success).toBe(false)
  })

  it('accepts the same filters for the summary, without pagination', () => {
    expect(alertsSummaryQuerySchema.parse({ acknowledged: 'false', area: 'licencias' })).toEqual({
      acknowledged: false,
      area: ['licencias'],
    })
  })

  it('accepts several kinds, areas and credential kinds, comma-separated or repeated', () => {
    expect(
      alertsQuerySchema.parse({
        kind: 'vencida,proxima',
        area: ['licencias', 'medicina'],
        credentialKind: 'licencia, certificado_medico',
      }),
    ).toMatchObject({
      kind: ['vencida', 'proxima'],
      area: ['licencias', 'medicina'],
      credentialKind: ['licencia', 'certificado_medico'],
    })
    expect(alertsSummaryQuerySchema.parse({ area: '', credentialKind: [] })).toEqual({})
    expect(alertsSummaryQuerySchema.safeParse({ credentialKind: 'licencia,pasaporte' }).success).toBe(false)
  })

  it('maps each credential kind to the area that manages it (D24)', () => {
    expect(alertAreaOf('licencia')).toBe('licencias')
    expect(alertAreaOf('habilitacion_tipo')).toBe('licencias')
    expect(alertAreaOf('habilitacion_clase')).toBe('licencias')
    expect(alertAreaOf('certificado_medico')).toBe('medicina')
  })
})
