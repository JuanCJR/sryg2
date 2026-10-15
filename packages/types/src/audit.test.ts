import { describe, expect, it } from 'vitest'
import { auditEntrySchema, auditExportQuerySchema, auditListQuerySchema } from './audit'

const ID = '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b11'

describe('auditListQuerySchema', () => {
  it('defaults to the first page of 50 with no filters', () => {
    expect(auditListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 50 })
  })

  it('accepts every filter of the viewer (REP-04)', () => {
    const parsed = auditListQuerySchema.parse({
      actor: ' ana ',
      action: 'crear',
      entity: 'personal_aeronautico',
      entityId: ID,
      personId: ID,
      from: '2026-10-01',
      to: '2026-10-14',
      page: '2',
      pageSize: '10',
    })
    expect(parsed).toEqual({
      actor: 'ana',
      action: ['crear'],
      entity: ['personal_aeronautico'],
      entityId: ID,
      personId: ID,
      from: '2026-10-01',
      to: '2026-10-14',
      page: 2,
      pageSize: 10,
    })
  })

  it('drops blank text filters', () => {
    expect(auditListQuerySchema.parse({ actor: '  ', entity: '' })).toEqual({ page: 1, pageSize: 50 })
    expect(auditListQuerySchema.parse({ action: ' ', entity: [' ', ','] })).toEqual({ page: 1, pageSize: 50 })
  })

  it('accepts several actions and entities, comma-separated or repeated', () => {
    expect(
      auditListQuerySchema.parse({
        action: 'crear,actualizar',
        entity: [' licencia ', 'personal_aeronautico,licencia'],
      }),
    ).toEqual({
      action: ['crear', 'actualizar'],
      entity: ['licencia', 'personal_aeronautico'],
      page: 1,
      pageSize: 50,
    })
    expect(auditListQuerySchema.safeParse({ action: 'crear,borrar_todo' }).success).toBe(false)
  })

  it('rejects an unknown action, malformed ids or dates, and a page size over 100', () => {
    expect(auditListQuerySchema.safeParse({ action: 'borrar_todo' }).success).toBe(false)
    expect(auditListQuerySchema.safeParse({ entityId: 'x' }).success).toBe(false)
    expect(auditListQuerySchema.safeParse({ personId: 'x' }).success).toBe(false)
    expect(auditListQuerySchema.safeParse({ from: '14/10/2026' }).success).toBe(false)
    expect(auditListQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false)
  })

  it('rejects a range whose start is after its end', () => {
    expect(auditListQuerySchema.safeParse({ from: '2026-10-15', to: '2026-10-14' }).success).toBe(false)
    expect(auditListQuerySchema.safeParse({ from: '2026-10-14', to: '2026-10-14' }).success).toBe(true)
  })
})

describe('auditExportQuerySchema', () => {
  it('takes the same filters without pagination (REP-05)', () => {
    expect(auditExportQuerySchema.parse({ action: 'actualizar', page: '3' })).toEqual({ action: ['actualizar'] })
    expect(auditExportQuerySchema.safeParse({ from: '2026-10-15', to: '2026-10-14' }).success).toBe(false)
  })
})

describe('auditEntrySchema', () => {
  it('describes one entry with its actor, or none for a system event', () => {
    const entry = {
      id: 7,
      occurredAt: '2026-10-14T12:00:00.000Z',
      actor: { id: ID, fullName: 'Usuario De Prueba', email: 'usuario.prueba@sryg.test' },
      action: 'crear',
      entity: 'personal_aeronautico',
      entityId: ID,
      changes: { after: { cedula: '00000101' } },
    }
    expect(auditEntrySchema.parse(entry)).toEqual(entry)
    expect(auditEntrySchema.parse({ ...entry, actor: null, entityId: null, changes: null }).actor).toBeNull()
  })
})
