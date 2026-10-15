import { describe, expect, it } from 'vitest'
import type { AuditTrailEntry } from '../dtos/audit-trail.dto'
import { toAuditCsv } from './audit-csv'

const entry = (overrides: Partial<AuditTrailEntry> = {}): AuditTrailEntry => ({
  id: 1,
  occurredAt: new Date('2026-10-14T12:00:00.000Z'),
  actor: { id: '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b11', fullName: 'Usuario De Prueba', email: 'prueba@sryg.test' },
  action: 'crear',
  entity: 'personal_aeronautico',
  entityId: null,
  changes: null,
  ...overrides,
})

const body = (csv: string) => csv.slice(1).split('\r\n').slice(1, -1)

describe('toAuditCsv (REP-05)', () => {
  it('writes only the header for an empty trail', () => {
    expect(toAuditCsv([])).toBe('\uFEFFfecha,actor,correo,accion,entidad,id_entidad,cambios\r\n')
  })

  it('quotes values with line breaks, commas or quotes', () => {
    const [row] = body(
      toAuditCsv([entry({ actor: { id: 'x', fullName: 'Pérez, "Ana"\nMaría', email: 'a@sryg.test' } })]),
    )
    expect(row).toBe('2026-10-14T12:00:00.000Z,"Pérez, ""Ana""\nMaría",a@sryg.test,crear,personal_aeronautico,,')
  })

  it('neutralizes every value a spreadsheet would run as a formula', () => {
    for (const start of ['=', '+', '-', '@', '\t']) {
      const [row] = body(toAuditCsv([entry({ entity: `${start}cmd` })]))
      expect(row).toContain(`,'${start}cmd,`)
    }
  })
})
