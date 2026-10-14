import { describe, expect, it } from 'vitest'
import { CATALOGS, catalogOptionsQuerySchema, catalogParamSchema } from './catalogs'

describe('catalog contracts (D19)', () => {
  it('lists the ten D19 catalogs', () => {
    expect(CATALOGS).toEqual([
      'license-types',
      'type-ratings',
      'class-ratings',
      'aircraft',
      'functions',
      'license-observations',
      'medical-observations',
      'document-types',
      'attachment-types',
      'nationalities',
    ])
  })

  it('accepts only known catalog slugs', () => {
    expect(catalogParamSchema.safeParse('aircraft').success).toBe(true)
    expect(catalogParamSchema.safeParse('usuarios').success).toBe(false)
  })

  it('defaults the limit to 20, caps it at 100 and trims the search', () => {
    expect(catalogOptionsQuerySchema.parse({})).toEqual({ limit: 20 })
    expect(catalogOptionsQuerySchema.parse({ q: '  b737 ', limit: '5' })).toEqual({ q: 'b737', limit: 5 })
    expect(catalogOptionsQuerySchema.safeParse({ limit: '101' }).success).toBe(false)
    expect(catalogOptionsQuerySchema.safeParse({ limit: '0' }).success).toBe(false)
  })
})
