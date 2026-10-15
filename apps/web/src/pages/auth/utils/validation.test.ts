import { describe, expect, it } from 'vitest'
import { validateLogin } from './validation'

describe('validateLogin', () => {
  it('accepts a well-formed email and a non-empty password', () => {
    expect(validateLogin({ email: 'ana@inac.gob.ve', password: 'x' })).toEqual({})
  })

  it('trims the email before checking it', () => {
    expect(validateLogin({ email: '  ana@inac.gob.ve ', password: 'x' })).toEqual({})
  })

  it('flags an empty email as required and a malformed one as invalid', () => {
    expect(validateLogin({ email: '   ', password: 'x' })).toEqual({ email: 'required' })
    expect(validateLogin({ email: 'ana@', password: 'x' })).toEqual({ email: 'invalid' })
    expect(validateLogin({ email: 'sin-arroba', password: 'x' })).toEqual({ email: 'invalid' })
  })

  it('flags an empty password as required but never trims it', () => {
    expect(validateLogin({ email: 'a@b.co', password: '' })).toEqual({ password: 'required' })
    expect(validateLogin({ email: 'a@b.co', password: '  ' })).toEqual({})
  })

  it('reports both fields at once', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({ email: 'required', password: 'required' })
  })
})
