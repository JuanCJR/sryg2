import { describe, expect, it } from 'vitest'
import { createPersonnelSchema, updatePersonnelSchema } from './personnel'

describe('createPersonnelSchema', () => {
  it('normalizes the cedula to digits only and defaults optional fields', () => {
    const parsed = createPersonnelSchema.parse({ cedula: 'V-12.345.678', fullName: 'Ana Perez' })
    expect(parsed).toMatchObject({ cedula: '12345678', fullName: 'Ana Perez' })
  })

  it('requires cedula and full name, rejects invalid cedulas and enum values', () => {
    expect(createPersonnelSchema.safeParse({ fullName: 'Ana' }).success).toBe(false)
    expect(createPersonnelSchema.safeParse({ cedula: '123', fullName: 'Ana' }).success).toBe(false)
    expect(createPersonnelSchema.safeParse({ cedula: '12345678', fullName: '  ' }).success).toBe(false)
    expect(
      createPersonnelSchema.safeParse({ cedula: '12345678', fullName: 'Ana', category: 'astronauta' }).success,
    ).toBe(false)
  })

  it('ignores server-managed fields', () => {
    const parsed = createPersonnelSchema.parse({ cedula: '12345678', fullName: 'Ana', id: 'x', photoRef: 'y' })
    expect(parsed).not.toHaveProperty('id')
    expect(parsed).not.toHaveProperty('photoRef')
  })
})

describe('updatePersonnelSchema', () => {
  it('accepts a partial body and normalizes a provided cedula', () => {
    expect(updatePersonnelSchema.parse({ cedula: 'v 9.876.543' })).toEqual({ cedula: '9876543' })
    expect(updatePersonnelSchema.parse({ cargo: null })).toEqual({ cargo: null })
  })

  it('rejects an empty body', () => {
    expect(updatePersonnelSchema.safeParse({}).success).toBe(false)
  })
})
