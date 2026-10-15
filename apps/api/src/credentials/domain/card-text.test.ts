import { describe, expect, it } from 'vitest'
import {
  bilingual,
  BLOOD_TYPE_CARD_LABEL,
  formatCardDate,
  licenseTypeSentence,
  MEDICAL_CLASS_CARD_LABEL,
  MEDICAL_CLASS_CARD_LABEL_EN,
  verificationUrl,
} from './card-text'

describe('card text (§4 of the parallel plan)', () => {
  it('formats dates as dd/Mmm/aaaa with Spanish month abbreviations', () => {
    expect(formatCardDate('2026-10-05')).toBe('05/Oct/2026')
    expect(formatCardDate('1990-01-31')).toBe('31/Ene/1990')
    expect(formatCardDate('2027-08-15')).toBe('15/Ago/2027')
    expect(formatCardDate(null)).toBe('—')
  })

  it('joins the Spanish and English texts of a catalog item, or keeps the Spanish one alone', () => {
    expect(bilingual({ es: 'Capitán', en: 'PIC' })).toBe('Capitán / PIC')
    expect(bilingual({ es: 'B737', en: null })).toBe('B737')
    expect(bilingual({ es: 'B737', en: 'B737' })).toBe('B737')
  })

  it('names the RAV 67 class and the blood type as the card prints them', () => {
    expect(MEDICAL_CLASS_CARD_LABEL).toEqual({
      clase_1: 'PRIMERA CLASE',
      clase_2: 'SEGUNDA CLASE',
      clase_3: 'TERCERA CLASE',
    })
    expect(MEDICAL_CLASS_CARD_LABEL_EN.clase_3).toBe('THIRD CLASS')
    expect(BLOOD_TYPE_CARD_LABEL.o_pos).toBe('O Rh (+)')
    expect(BLOOD_TYPE_CARD_LABEL.ab_neg).toBe('AB Rh (-)')
  })

  it('lists the license types a medical certificate covers as one sentence', () => {
    const types = [
      { es: 'Controlador de tránsito aéreo', en: 'Air Traffic Controller' },
      { es: 'Alumno controlador de tránsito aéreo', en: null },
      { es: 'Operador de estaciones aeronáuticas', en: null },
    ]
    expect(licenseTypeSentence(types)).toBe(
      'Controlador de tránsito aéreo, alumno controlador de tránsito aéreo y operador de estaciones aeronáuticas',
    )
    expect(licenseTypeSentence(types.slice(0, 1))).toBe('Controlador de tránsito aéreo')
    expect(licenseTypeSentence([])).toBe('')
  })

  it('points the QR at the public verification page of the web app (D9)', () => {
    expect(verificationUrl('https://sryg.test', 'f1e2d3c4-b5a6-4789-8abc-def012345678')).toBe(
      'https://sryg.test/verificar/f1e2d3c4-b5a6-4789-8abc-def012345678',
    )
    expect(verificationUrl('https://sryg.test/', 'abc')).toBe('https://sryg.test/verificar/abc')
  })
})
