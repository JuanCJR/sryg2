import { describe, expect, it } from 'vitest'
import { createPersonnelSchema, updatePersonnelSchema } from './personnel'

const base = { cedula: 'V-12.345.678', firstNames: 'Ana María', lastNames: 'Pérez Gómez' }

describe('createPersonnelSchema', () => {
  it('normalizes the cedula to digits only and keeps names, birth date and address', () => {
    const parsed = createPersonnelSchema.parse({ ...base, birthDate: '1990-05-01', address: 'Calle 1, Maracay' })
    expect(parsed).toMatchObject({
      cedula: '12345678',
      firstNames: 'Ana María',
      lastNames: 'Pérez Gómez',
      birthDate: '1990-05-01',
      address: 'Calle 1, Maracay',
    })
  })

  it('requires cedula, first names and last names', () => {
    expect(createPersonnelSchema.safeParse({ ...base, cedula: undefined }).success).toBe(false)
    expect(createPersonnelSchema.safeParse({ ...base, cedula: '123' }).success).toBe(false)
    expect(createPersonnelSchema.safeParse({ ...base, firstNames: '  ' }).success).toBe(false)
    expect(createPersonnelSchema.safeParse({ ...base, lastNames: undefined }).success).toBe(false)
  })

  it('validates catalog ids, birth date and enums', () => {
    expect(createPersonnelSchema.safeParse({ ...base, documentTypeId: 'x' }).success).toBe(false)
    expect(createPersonnelSchema.safeParse({ ...base, nationalityId: 'x' }).success).toBe(false)
    expect(createPersonnelSchema.safeParse({ ...base, birthDate: '01/05/1990' }).success).toBe(false)
    expect(createPersonnelSchema.safeParse({ ...base, category: 'astronauta' }).success).toBe(false)
    const ids = { documentTypeId: '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b11', nationalityId: null }
    expect(createPersonnelSchema.parse({ ...base, ...ids })).toMatchObject(ids)
  })

  it('ignores server-managed fields such as the photo and the signature', () => {
    const parsed = createPersonnelSchema.parse({ ...base, id: 'x', fullName: 'y', photo: 'z', signatureMime: 'w' })
    for (const key of ['id', 'fullName', 'photo', 'signatureMime']) expect(parsed).not.toHaveProperty(key)
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
