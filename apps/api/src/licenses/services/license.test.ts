import { describe, expect, it } from 'vitest'
import { ConflictError } from '../../common/errors/domain-errors'
import { addMonths, computeLicenseExpiry, isValidOn } from './license'

describe('license expiry (D3, D20)', () => {
  it('adds calendar months and falls on the last day of a shorter month', () => {
    expect(addMonths('2026-01-31', 24)).toBe('2028-01-31')
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28')
    expect(addMonths('2028-02-29', 12)).toBe('2029-02-28')
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15')
  })

  it('is null when the type does not apply expiry, whatever its months', () => {
    expect(computeLicenseExpiry('2026-01-01', { appliesExpiry: false, validityMonths: 12, isPlaceholder: true })).toBe(
      null,
    )
  })

  it('uses the configured months and refuses a type with no validity configured', () => {
    expect(computeLicenseExpiry('2026-01-01', { appliesExpiry: true, validityMonths: 6, isPlaceholder: false })).toBe(
      '2026-07-01',
    )
    expect(() =>
      computeLicenseExpiry('2026-01-01', { appliesExpiry: true, validityMonths: null, isPlaceholder: true }),
    ).toThrow(ConflictError)
  })

  it('is valid through its expiry day, and always without expiry', () => {
    expect(isValidOn('2026-10-14', '2026-10-14')).toBe(true)
    expect(isValidOn('2026-10-13', '2026-10-14')).toBe(false)
    expect(isValidOn(null, '2026-10-14')).toBe(true)
  })
})
