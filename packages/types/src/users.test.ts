import { describe, expect, it } from 'vitest'
import {
  accessLogSchema,
  changePasswordSchema,
  createUserSchema,
  managedUserSchema,
  updateUserSchema,
  userCredentialsResponseSchema,
} from './users'

const ID = '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b11'

describe('changePasswordSchema (AUTH-08, D4)', () => {
  it('requires the current password and a new one of at least 10 characters, with no composition rules', () => {
    expect(changePasswordSchema.parse({ currentPassword: 'x', newPassword: 'aaaaaaaaaa' })).toEqual({
      currentPassword: 'x',
      newPassword: 'aaaaaaaaaa',
    })
    expect(changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'aaaaaaaaa' }).success).toBe(false)
    expect(changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'aaaaaaaaaa' }).success).toBe(false)
    expect(changePasswordSchema.safeParse({ newPassword: 'aaaaaaaaaa' }).success).toBe(false)
  })
})

describe('accessLogSchema (D23)', () => {
  it('holds the successful and the failed accesses with date and IP', () => {
    const log = {
      successful: [{ at: '2026-10-01T12:00:00.000Z', ip: '198.51.100.7' }],
      failed: [{ at: '2026-10-01T11:59:00.000Z', ip: null }],
    }
    expect(accessLogSchema.parse(log)).toEqual(log)
    expect(accessLogSchema.safeParse({ successful: [{ at: 'ayer', ip: null }], failed: [] }).success).toBe(false)
  })
})

describe('user administration contracts (AUTH-06, D24)', () => {
  const create = { email: 'nuevo@sryg.test', fullName: '  Usuario Nuevo  ', role: 'supervisor', area: 'medicina' }

  it('creates a user with email, trimmed name, role and area', () => {
    expect(createUserSchema.parse(create)).toEqual({ ...create, fullName: 'Usuario Nuevo' })
    expect(createUserSchema.safeParse({ ...create, email: 'no-es-correo' }).success).toBe(false)
    expect(createUserSchema.safeParse({ ...create, fullName: '   ' }).success).toBe(false)
    expect(createUserSchema.safeParse({ ...create, role: 'root' }).success).toBe(false)
    expect(createUserSchema.safeParse({ ...create, area: 'finanzas' }).success).toBe(false)
  })

  it('edits only name, role and area, and needs at least one of them', () => {
    expect(updateUserSchema.parse({ role: 'consulta' })).toEqual({ role: 'consulta' })
    expect(updateUserSchema.safeParse({}).success).toBe(false)
    expect(updateUserSchema.safeParse({ fullName: '' }).success).toBe(false)
    expect(updateUserSchema.parse({ email: 'otro@sryg.test', fullName: 'Otro' })).toEqual({ fullName: 'Otro' })
  })

  it('describes a managed user without any password data', () => {
    const user = {
      id: ID,
      email: 'ana@sryg.test',
      fullName: 'Ana',
      role: 'administrador',
      area: 'ambas',
      isActive: true,
      mustChangePassword: false,
      createdAt: '2026-10-01T12:00:00.000Z',
      updatedAt: '2026-10-01T12:00:00.000Z',
    }
    expect(managedUserSchema.parse({ ...user, passwordHash: 'x' })).toEqual(user)
    expect(userCredentialsResponseSchema.parse({ user, temporaryPassword: 'abcdefghijkl' })).toEqual({
      user,
      temporaryPassword: 'abcdefghijkl',
    })
  })
})
