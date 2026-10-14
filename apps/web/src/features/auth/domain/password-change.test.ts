import { describe, expect, it } from 'vitest'
import { validatePasswordChange } from './password-change'

describe('validatePasswordChange', () => {
  it('accepts any 10-character password that is confirmed', () => {
    expect(validatePasswordChange({ current: 'x', next: 'aaaaaaaaaa', confirm: 'aaaaaaaaaa' })).toEqual({})
  })

  it('names every problem at once', () => {
    expect(validatePasswordChange({ current: '', next: 'aaaaaaaaa', confirm: 'b' })).toEqual({
      current: 'Escriba su contraseña actual.',
      next: 'Use al menos 10 caracteres.',
      confirm: 'Las contraseñas no coinciden.',
    })
  })
})
