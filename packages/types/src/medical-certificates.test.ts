import { describe, expect, it } from 'vitest'
import {
  medicalExpiryDate,
  registerMedicalCertificateSchema,
  renewMedicalCertificateSchema,
} from './medical-certificates'

const OBSERVATION = '6f0c2d1e-3b4a-4c5d-8e9f-0a1b2c3d4e5f'

describe('registerMedicalCertificateSchema (MED-01, BR-03, BR-05)', () => {
  it('accepts a RAV 67 class, an issue date, catalog observations and free-text restrictions', () => {
    expect(
      registerMedicalCertificateSchema.parse({
        rav67Class: 'clase_2',
        issueDate: '2026-10-01',
        observationIds: [OBSERVATION],
        restrictions: '  Debe usar lentes correctivos  ',
      }),
    ).toEqual({
      rav67Class: 'clase_2',
      issueDate: '2026-10-01',
      observationIds: [OBSERVATION],
      restrictions: 'Debe usar lentes correctivos',
    })
  })

  it('defaults to no observations and no restrictions, and leaves the number to the server (D22)', () => {
    const parsed = registerMedicalCertificateSchema.parse({ rav67Class: 'clase_1', issueDate: '2026-10-01' })
    expect(parsed).toEqual({ rav67Class: 'clase_1', issueDate: '2026-10-01', observationIds: [], restrictions: null })
    expect(registerMedicalCertificateSchema.parse({ ...parsed, restrictions: '   ' }).restrictions).toBeNull()
  })

  it('rejects a class outside RAV 67, a bad date and repeated observations', () => {
    const base = { rav67Class: 'clase_1', issueDate: '2026-10-01' }
    expect(registerMedicalCertificateSchema.safeParse({ ...base, rav67Class: 'clase_4' }).success).toBe(false)
    expect(registerMedicalCertificateSchema.safeParse({ ...base, issueDate: '01/10/2026' }).success).toBe(false)
    expect(
      registerMedicalCertificateSchema.safeParse({ ...base, observationIds: [OBSERVATION, OBSERVATION] }).success,
    ).toBe(false)
  })

  it('rejects any field outside the administrative data, so no clinical field can sneak in (BR-05, D8)', () => {
    const base = { rav67Class: 'clase_1', issueDate: '2026-10-01' }
    expect(registerMedicalCertificateSchema.safeParse({ ...base, diagnosis: 'x' }).success).toBe(false)
    expect(registerMedicalCertificateSchema.safeParse({ ...base, expiryDate: '2030-01-01' }).success).toBe(false)
  })
})

describe('renewMedicalCertificateSchema (MED-01)', () => {
  it('needs only the new issue date; omitted observations and restrictions keep their current value', () => {
    expect(renewMedicalCertificateSchema.parse({ issueDate: '2026-10-01' })).toEqual({ issueDate: '2026-10-01' })
    expect(renewMedicalCertificateSchema.parse({ issueDate: '2026-10-01', restrictions: '' })).toEqual({
      issueDate: '2026-10-01',
      restrictions: null,
    })
  })

  it('does not change the class and accepts no clinical field', () => {
    expect(renewMedicalCertificateSchema.safeParse({ issueDate: '2026-10-01', rav67Class: 'clase_1' }).success).toBe(
      false,
    )
    expect(renewMedicalCertificateSchema.safeParse({ issueDate: '2026-10-01', history: 'x' }).success).toBe(false)
  })
})

describe('medicalExpiryDate (D3)', () => {
  it('adds the validity months of the class to the issue date', () => {
    expect(medicalExpiryDate('2026-10-14', 12)).toBe('2027-10-14')
    expect(medicalExpiryDate('2026-11-30', 6)).toBe('2027-05-30')
  })

  it('clamps to the last day of a shorter month', () => {
    expect(medicalExpiryDate('2026-08-31', 6)).toBe('2027-02-28')
    expect(medicalExpiryDate('2027-08-31', 6)).toBe('2028-02-29')
  })

  it('rejects a non-positive validity or a bad date', () => {
    expect(() => medicalExpiryDate('2026-10-14', 0)).toThrow(RangeError)
    expect(() => medicalExpiryDate('14/10/2026', 12)).toThrow(RangeError)
  })
})
