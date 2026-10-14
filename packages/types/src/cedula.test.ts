import { describe, expect, it } from 'vitest'
import { cedulaSchema, normalizeCedula } from './cedula'

describe('normalizeCedula', () => {
  it.each([
    ['12345678', '12345678'],
    ['V-12345678', '12345678'],
    ['v12345678', '12345678'],
    ['V 12.345.678', '12345678'],
    ['  V-1234567 ', '1234567'],
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeCedula(input)).toBe(expected)
  })
})

describe('cedulaSchema', () => {
  it('accepts 6 to 9 digit identifiers after normalization', () => {
    expect(cedulaSchema.parse('V-123456')).toBe('123456')
    expect(cedulaSchema.parse('123456789')).toBe('123456789')
  })

  it.each(['12345', '1234567890', 'E-12345678', 'abc12345', '', '12 34 5x'])('rejects %j', (input) => {
    expect(cedulaSchema.safeParse(input).success).toBe(false)
  })
})
