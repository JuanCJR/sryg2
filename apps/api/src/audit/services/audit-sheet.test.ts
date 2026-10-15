import { describe, expect, it } from 'vitest'
import type { AuditTrailEntry } from '../dtos/audit-trail.dto'
import { AUDIT_SHEET_HEADER, toAuditSheet } from './audit-sheet'

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

const GENERATED = new Date('2026-10-15T08:30:00.000Z')

describe('toAuditSheet (REP-05)', () => {
  it('has a title, the generation time and the count above the header', () => {
    const sheet = toAuditSheet([], GENERATED)
    expect(sheet.title).toBe('Registro de auditoría')
    expect(sheet.details).toEqual(['SRYG · INAC Maracay — Generado: 2026-10-15 08:30 UTC', 'Registros: 0'])
    expect(sheet.columns.map((c) => c.header)).toEqual([...AUDIT_SHEET_HEADER])
    expect(sheet.rows).toEqual([])
  })

  it('writes one row per entry, blank for an anonymous actor, changes as JSON', () => {
    const sheet = toAuditSheet(
      [entry(), entry({ actor: null, action: 'autenticar', changes: { after: { ok: false } } })],
      GENERATED,
    )
    expect(sheet.rows).toEqual([
      ['2026-10-14T12:00:00.000Z', 'Usuario De Prueba', 'prueba@sryg.test', 'crear', 'personal_aeronautico', '', ''],
      ['2026-10-14T12:00:00.000Z', '', '', 'autenticar', 'personal_aeronautico', '', '{"after":{"ok":false}}'],
    ])
  })
})
