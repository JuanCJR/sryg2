import { describe, expect, it } from 'vitest'
import { deriveCredentialStatus } from './credential-status'

const TODAY = '2026-10-14'

describe('deriveCredentialStatus', () => {
  it('is bloqueada whenever there is an active block, whatever the expiry', () => {
    expect(deriveCredentialStatus('2030-01-01', TODAY, 30, true)).toBe('bloqueada')
    expect(deriveCredentialStatus('2020-01-01', TODAY, 30, true)).toBe('bloqueada')
    expect(deriveCredentialStatus(null, TODAY, 30, true)).toBe('bloqueada')
  })

  it('is vigente when the credential does not expire (D20)', () => {
    expect(deriveCredentialStatus(null, TODAY, 30, false)).toBe('vigente')
  })

  it('is vencida once the expiry date has passed', () => {
    expect(deriveCredentialStatus('2026-10-13', TODAY, 30, false)).toBe('vencida')
    expect(deriveCredentialStatus('2001-01-01', TODAY, 30, false)).toBe('vencida')
  })

  it('is proxima_a_vencer from the expiry day back to thresholdDays before it', () => {
    expect(deriveCredentialStatus('2026-10-14', TODAY, 30, false)).toBe('proxima_a_vencer')
    expect(deriveCredentialStatus('2026-11-13', TODAY, 30, false)).toBe('proxima_a_vencer')
    expect(deriveCredentialStatus('2026-11-14', TODAY, 30, false)).toBe('vigente')
  })

  it('accepts Date values and ignores the time of day', () => {
    expect(deriveCredentialStatus('2026-10-20', new Date('2026-10-14T23:59:00Z'), 5, false)).toBe('vigente')
    expect(deriveCredentialStatus('2026-10-19', new Date('2026-10-14T00:00:00Z'), 5, false)).toBe('proxima_a_vencer')
  })

  it('rejects malformed dates and negative thresholds', () => {
    expect(() => deriveCredentialStatus('14/10/2026', TODAY, 30, false)).toThrow(RangeError)
    expect(() => deriveCredentialStatus('2026-10-14', TODAY, -1, false)).toThrow(RangeError)
  })
})
