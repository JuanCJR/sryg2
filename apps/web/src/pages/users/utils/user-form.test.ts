import { describe, expect, it } from 'vitest'
import { EMPTY_USER_FORM, validateUserForm } from './user-form'

describe('validateUserForm', () => {
  it('requires a valid email only when creating, and always a name', () => {
    expect(validateUserForm(EMPTY_USER_FORM, 'create')).toEqual({
      email: 'Ingrese un correo válido.',
      fullName: 'Ingrese el nombre.',
    })
    expect(validateUserForm({ ...EMPTY_USER_FORM, fullName: '  ' }, 'edit')).toEqual({ fullName: 'Ingrese el nombre.' })
    expect(validateUserForm({ ...EMPTY_USER_FORM, email: 'a@sryg.test', fullName: 'A' }, 'create')).toEqual({})
  })
})
