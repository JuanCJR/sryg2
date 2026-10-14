import { describe, expect, it } from 'vitest'
import {
  alertThresholdInputSchema,
  detectGraphicImageMime,
  GRAPHIC_RESOURCE_MAX_BYTES,
  GRAPHIC_RESOURCE_MIME_TYPES,
  medicalValidityInputSchema,
  PLACEHOLDER_SETTINGS,
  SETTING_KEYS,
} from './settings'

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

describe('parameter inputs (D3)', () => {
  it('accepts a positive whole number of days for the alert threshold', () => {
    expect(alertThresholdInputSchema.parse({ days: 45 })).toEqual({ days: 45 })
    for (const days of [0, -1, 1.5, '30', null])
      expect(alertThresholdInputSchema.safeParse({ days }).success).toBe(false)
    expect(alertThresholdInputSchema.safeParse({}).success).toBe(false)
  })

  it('requires a positive whole number of months for each of the three RAV 67 classes', () => {
    const valid = { clase_1: 6, clase_2: 12, clase_3: 24 }
    expect(medicalValidityInputSchema.parse(valid)).toEqual(valid)
    expect(medicalValidityInputSchema.safeParse({ clase_1: 6, clase_2: 12 }).success).toBe(false)
    expect(medicalValidityInputSchema.safeParse({ ...valid, clase_3: 0 }).success).toBe(false)
    expect(medicalValidityInputSchema.safeParse({ ...valid, clase_4: 1 }).success).toBe(false)
  })
})

describe('graphic resources (D18)', () => {
  it('accepts PNG and JPEG of up to 500 KB', () => {
    expect(GRAPHIC_RESOURCE_MIME_TYPES).toEqual(['image/png', 'image/jpeg'])
    expect(GRAPHIC_RESOURCE_MAX_BYTES).toBe(500 * 1024)
  })

  it('detects the image type from its signature, not from the declared type', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00])
    expect(detectGraphicImageMime(png)).toBe('image/png')
    expect(detectGraphicImageMime(jpeg)).toBe('image/jpeg')
    expect(detectGraphicImageMime(new TextEncoder().encode('GIF89a'))).toBeNull()
    expect(detectGraphicImageMime(new Uint8Array())).toBeNull()
  })
})
