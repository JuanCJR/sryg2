import { describe, expect, it } from 'vitest'
import { PLACEHOLDER_SETTINGS, SETTING_KEYS } from './settings'

describe('settings placeholders (D3)', () => {
  it('has a 30-day alert threshold and 12-month validity for each RAV 67 class', () => {
    expect(SETTING_KEYS).toHaveLength(4)
    expect(PLACEHOLDER_SETTINGS).toEqual({
      'alerts.threshold_days': 30,
      'medical.validity_months.clase_1': 12,
      'medical.validity_months.clase_2': 12,
      'medical.validity_months.clase_3': 12,
    })
  })
})
