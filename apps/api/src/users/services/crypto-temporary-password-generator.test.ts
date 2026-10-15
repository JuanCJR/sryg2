import { PASSWORD_MIN_LENGTH } from '@sryg/types'
import { describe, expect, it } from 'vitest'
import { CryptoTemporaryPasswordGenerator } from './crypto-temporary-password-generator'

describe('CryptoTemporaryPasswordGenerator', () => {
  it('meets the D4 minimum, avoids look-alike characters and does not repeat', () => {
    const generator = new CryptoTemporaryPasswordGenerator()
    const passwords = Array.from({ length: 50 }, () => generator.generate())
    for (const password of passwords) {
      expect(password.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH)
      expect(password).toMatch(/^[a-zA-Z2-9]+$/)
      expect(password).not.toMatch(/[01OIl]/)
    }
    expect(new Set(passwords).size).toBe(passwords.length)
  })
})
