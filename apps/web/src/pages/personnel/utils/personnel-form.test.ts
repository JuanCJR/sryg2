import { describe, expect, it } from 'vitest'
import type { PersonnelDto } from '@sryg/types'
import { EMPTY_PERSONNEL_FORM, formFromPersonnel, toCreateInput, toUpdateInput } from './personnel-form'

const DTO: PersonnelDto = {
  id: '0b6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e11',
  cedula: '00000101',
  firstNames: 'Persona',
  lastNames: 'De Prueba',
  documentTypeId: '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b11',
  nationalityId: null,
  birthDate: null,
  address: 'Calle ficticia',
  email: null,
  phone: null,
  bloodType: null,
  cargo: null,
  dependencia: null,
  category: null,
  status: 'activo',
  hasPhoto: false,
  hasSignature: false,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
}
const DOC_TYPE = { id: DTO.documentTypeId!, nameEs: 'Cédula', nameEn: null }

describe('toCreateInput', () => {
  it('names each invalid field in Spanish', () => {
    const result = toCreateInput({ ...EMPTY_PERSONNEL_FORM, cedula: '12', email: 'x' })
    expect(result).toEqual({
      ok: false,
      errors: {
        cedula: 'Ingrese un número de documento de 6 a 9 dígitos.',
        firstNames: 'Ingrese los nombres.',
        lastNames: 'Ingrese los apellidos.',
        email: 'Ingrese un correo válido.',
      },
    })
  })

  it('leaves empty optional fields out and trims text', () => {
    const result = toCreateInput({
      ...EMPTY_PERSONNEL_FORM,
      cedula: '1234567',
      firstNames: 'Ana',
      lastNames: 'Pérez',
      cargo: '  Piloto ',
    })
    expect(result).toEqual({
      ok: true,
      value: { cedula: '1234567', firstNames: 'Ana', lastNames: 'Pérez', cargo: 'Piloto' },
    })
  })
})

describe('toUpdateInput', () => {
  it('sends only the changed fields, null for a cleared one, and nothing when nothing changed', () => {
    const values = formFromPersonnel(DTO, { documentType: DOC_TYPE, nationality: null })
    expect(toUpdateInput(values, DTO)).toEqual({ ok: true, value: null })
    expect(toUpdateInput({ ...values, address: '', documentType: null, cargo: 'Capitán' }, DTO)).toEqual({
      ok: true,
      value: { address: null, documentTypeId: null, cargo: 'Capitán' },
    })
  })
})
