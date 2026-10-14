import { describe, expect, it } from 'vitest'
import { authUserSchema } from './auth'

const user = {
  id: '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b11',
  email: 'ana@sryg.test',
  fullName: 'Ana',
  role: 'supervisor',
  area: 'medicina',
  mustChangePassword: false,
}

describe('authUserSchema', () => {
  it('carries the area (D24) and the forced password change flag (D4)', () => {
    expect(authUserSchema.parse(user)).toEqual(user)
    expect(authUserSchema.safeParse({ ...user, area: 'finanzas' }).success).toBe(false)
    expect(authUserSchema.safeParse({ ...user, mustChangePassword: undefined }).success).toBe(false)
  })
})
