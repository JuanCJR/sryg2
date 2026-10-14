import { describe, expect, it } from 'vitest'
import {
  CATALOGS,
  catalogItemCreateSchemaFor,
  catalogItemSchemaFor,
  catalogItemUpdateSchemaFor,
  catalogListQuerySchema,
  catalogOptionsQuerySchema,
  catalogParamSchema,
} from './catalogs'

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

describe('catalog maintenance contracts (D19, W1-11)', () => {
  it('lists with search, pagination and an optional active filter', () => {
    expect(catalogListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 })
    expect(catalogListQuerySchema.parse({ q: ' b7 ', page: '2', pageSize: '50', active: 'false' })).toEqual({
      q: 'b7',
      page: 2,
      pageSize: 50,
      active: false,
    })
    expect(catalogListQuerySchema.parse({ active: 'true' }).active).toBe(true)
    expect(catalogListQuerySchema.safeParse({ active: 'yes' }).success).toBe(false)
    expect(catalogListQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false)
  })

  it('requires the Spanish name and turns a blank English name into null', () => {
    const schema = catalogItemCreateSchemaFor('nationalities')
    expect(schema.parse({ nameEs: '  Venezolana ', nameEn: ' Venezuelan ' })).toEqual({
      nameEs: 'Venezolana',
      nameEn: 'Venezuelan',
    })
    expect(schema.parse({ nameEs: 'Venezolana', nameEn: '  ' })).toEqual({ nameEs: 'Venezolana', nameEn: null })
    expect(schema.safeParse({ nameEs: '   ' }).success).toBe(false)
    expect(schema.safeParse({ nameEn: 'Venezuelan' }).success).toBe(false)
  })

  it('drops the license-type fields from the other catalogs', () => {
    expect(catalogItemCreateSchemaFor('aircraft').parse({ nameEs: 'B737', rav60Category: 'piloto_privado' })).toEqual({
      nameEs: 'B737',
    })
  })

  it('adds the D13/D20 fields to license types', () => {
    const schema = catalogItemCreateSchemaFor('license-types')
    const valid = {
      nameEs: 'Piloto Comercial - Avión',
      nameEn: 'Commercial Pilot - Airplane',
      rav60Category: 'piloto_comercial',
      requiredMedicalClass: 'clase_1',
      appliesExpiry: true,
      validityMonths: 12,
    }
    expect(schema.parse(valid)).toEqual(valid)
    expect(schema.safeParse({ ...valid, rav60Category: undefined }).success).toBe(false)
    expect(schema.safeParse({ ...valid, requiredMedicalClass: 'clase_4' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, validityMonths: 0 }).success).toBe(false)
    expect(schema.safeParse({ ...valid, validityMonths: 1.5 }).success).toBe(false)
    expect(schema.parse({ ...valid, requiredMedicalClass: null, validityMonths: null })).toMatchObject({
      requiredMedicalClass: null,
      validityMonths: null,
    })
  })

  it('updates any subset, including active, but never an empty body', () => {
    expect(catalogItemUpdateSchemaFor('functions').parse({ active: false })).toEqual({ active: false })
    expect(catalogItemUpdateSchemaFor('license-types').parse({ validityMonths: 24 })).toEqual({ validityMonths: 24 })
    expect(catalogItemUpdateSchemaFor('functions').safeParse({}).success).toBe(false)
    expect(catalogItemUpdateSchemaFor('functions').safeParse({ rav60Category: 'piloto_privado' }).success).toBe(false)
  })

  it('describes an item, with the license-type fields only on license types', () => {
    const base = {
      id: '7a1c2b3d-4e5f-4a6b-8c7d-9e0f1a2b3c01',
      nameEs: 'Venezolana',
      nameEn: null,
      active: true,
      createdAt: '2026-10-01T12:00:00.000Z',
      updatedAt: '2026-10-01T12:00:00.000Z',
    }
    expect(catalogItemSchemaFor('nationalities').parse(base)).toEqual(base)
    const licenseType = {
      ...base,
      rav60Category: 'piloto_privado',
      requiredMedicalClass: 'clase_2',
      appliesExpiry: true,
      validityMonths: 12,
      validityIsPlaceholder: true,
    }
    expect(catalogItemSchemaFor('license-types').parse(licenseType)).toEqual(licenseType)
    expect(catalogItemSchemaFor('license-types').safeParse(base).success).toBe(false)
  })
})
