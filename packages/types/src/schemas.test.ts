import { describe, expect, it } from 'vitest'
import { BLOOD_TYPES, CREDENTIAL_STATUSES, ROLES } from './enums'
import { listQuerySchema } from './common'

describe('enums', () => {
  it('does not persist proxima_a_vencer (derived, BR-12)', () => {
    expect(CREDENTIAL_STATUSES).toEqual(['activa', 'vencida', 'bloqueada'])
  })

  it('exposes roles and blood types', () => {
    expect(ROLES).toEqual(['administrador', 'supervisor', 'consulta'])
    expect(BLOOD_TYPES).toHaveLength(8)
  })
})

describe('listQuerySchema', () => {
  it('applies defaults and coerces numbers', () => {
    expect(listQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 })
    expect(listQuerySchema.parse({ page: '2', pageSize: '50', q: 'x' })).toEqual({ page: 2, pageSize: 50, q: 'x' })
  })

  it('rejects out-of-range pagination', () => {
    expect(listQuerySchema.safeParse({ pageSize: 101 }).success).toBe(false)
    expect(listQuerySchema.safeParse({ page: 0 }).success).toBe(false)
  })
})
