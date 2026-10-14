import { describe, expect, it } from 'vitest'
import { alertKindFor, desiredAlerts } from './alert'

describe('alertKindFor (BR-12)', () => {
  const today = '2026-10-14'

  it('is vencida from the day after the expiry date', () => {
    expect(alertKindFor('2026-10-13', today, 30)).toBe('vencida')
  })

  it('is proxima from the expiry date back to the threshold', () => {
    expect(alertKindFor('2026-10-14', today, 30)).toBe('proxima')
    expect(alertKindFor('2026-11-13', today, 30)).toBe('proxima')
  })

  it('raises nothing beyond the threshold or without expiry (D20)', () => {
    expect(alertKindFor('2026-11-14', today, 30)).toBeNull()
    expect(alertKindFor(null, today, 30)).toBeNull()
  })
})

describe('desiredAlerts', () => {
  it('keeps one alert per alerting credential, due on its expiry date', () => {
    const base = { personalId: 'p1', credentialKind: 'licencia' } as const
    expect(
      desiredAlerts(
        [
          { ...base, credentialId: 'c1', expiryDate: '2026-10-01' },
          { ...base, credentialId: 'c2', expiryDate: '2026-10-20' },
          { ...base, credentialId: 'c3', expiryDate: '2027-01-01' },
        ],
        '2026-10-14',
        30,
      ),
    ).toEqual([
      { ...base, credentialId: 'c1', kind: 'vencida', dueDate: '2026-10-01' },
      { ...base, credentialId: 'c2', kind: 'proxima', dueDate: '2026-10-20' },
    ])
  })
})
