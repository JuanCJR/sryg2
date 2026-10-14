import { describe, expect, it } from 'vitest'
import { issueLicenseSchema, licenseCheckQuerySchema, licenseListQuerySchema, renewLicenseSchema } from './licenses'

const ID = '0b6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e11'
const OTHER = '1c7a2d4f-2a8b-4d2f-8e6f-3b7c9d0e1f22'

describe('license contracts (D20, D22)', () => {
  it('never takes an expiry for the license: the API computes it from the type', () => {
    const parsed = issueLicenseSchema.parse({
      personalId: ID,
      licenseTypeId: OTHER,
      issueDate: '2026-10-14',
      expiryDate: '2030-01-01',
    })
    expect(parsed).not.toHaveProperty('expiryDate')
    expect(parsed).toMatchObject({ observationIds: [], addTypeRatings: [], addClassRatings: [] })
    expect(parsed.number).toBeUndefined()
  })

  it('deduplicates observation and aircraft ids', () => {
    const parsed = issueLicenseSchema.parse({
      personalId: ID,
      licenseTypeId: OTHER,
      issueDate: '2026-10-14',
      observationIds: [ID, ID],
      addClassRatings: [{ classRatingId: OTHER, aircraftIds: [ID, ID, OTHER], expiryDate: '2027-10-14' }],
    })
    expect(parsed.observationIds).toEqual([ID])
    expect(parsed.addClassRatings[0]!.aircraftIds).toEqual([ID, OTHER])
  })

  it('requires a valid issue date and rejects an empty number', () => {
    expect(issueLicenseSchema.safeParse({ personalId: ID, licenseTypeId: OTHER }).success).toBe(false)
    expect(
      issueLicenseSchema.safeParse({ personalId: ID, licenseTypeId: OTHER, issueDate: '2026-13-01' }).success,
    ).toBe(false)
    expect(renewLicenseSchema.safeParse({ issueDate: '2026-10-14', number: '  ' }).success).toBe(false)
  })

  it('filters the query by applicant, number, type and an ordered expiry range', () => {
    expect(
      licenseListQuerySchema.parse({ q: ' perez ', number: '', expiryFrom: '2026-01-01', expiryTo: '2026-12-31' }),
    ).toEqual({ q: 'perez', page: 1, pageSize: 20, expiryFrom: '2026-01-01', expiryTo: '2026-12-31' })
    expect(licenseListQuerySchema.safeParse({ expiryFrom: '2027-01-01', expiryTo: '2026-01-01' }).success).toBe(false)
  })

  it('checks a trámite by type or by license, never both', () => {
    expect(licenseCheckQuerySchema.safeParse({ personalId: ID, licenseTypeId: OTHER }).success).toBe(true)
    expect(licenseCheckQuerySchema.safeParse({ personalId: ID, licenseTypeId: OTHER, licenseId: ID }).success).toBe(
      false,
    )
  })
})
