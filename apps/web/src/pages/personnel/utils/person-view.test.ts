import { describe, expect, it } from 'vitest'
import type { PersonnelDto } from '@sryg/types'
import { toListRow, toPersonView } from './person-view'

const dto: PersonnelDto = {
  id: '0b6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e11',
  cedula: 'V-00.000.101',
  firstNames: 'Persona',
  lastNames: 'De Prueba Uno',
  documentTypeId: null,
  nationalityId: null,
  birthDate: '1990-04-02',
  address: null,
  email: 'persona.prueba@sryg.test',
  phone: null,
  bloodType: 'o_pos',
  cargo: null,
  dependencia: 'Dependencia ficticia',
  category: 'controlador_transito_aereo',
  status: 'activo',
  hasPhoto: false,
  hasSignature: false,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-02T13:05:00.000Z',
}

describe('toPersonView', () => {
  it('resolves enum labels and the D21 name fields', () => {
    expect(toPersonView(dto)).toMatchObject({
      nombre: 'Persona De Prueba Uno',
      nombres: 'Persona',
      apellidos: 'De Prueba Uno',
      categoria: 'Controlador de tránsito aéreo',
      tipoSangre: 'O+',
      fechaNacimiento: '02 abr 1990',
      estatusInstitucional: 'Activo',
    })
  })

  it('shows an em dash for every missing value', () => {
    const view = toPersonView({ ...dto, category: null, bloodType: null, birthDate: null, address: null, phone: null })
    expect([view.categoria, view.tipoSangre, view.fechaNacimiento, view.direccion, view.telefono]).toEqual([
      '—',
      '—',
      '—',
      '—',
      '—',
    ])
  })
})

describe('toListRow', () => {
  it('leaves the credential status unknown until the API exposes it', () => {
    expect(toListRow(dto)).toEqual({
      id: dto.id,
      cedula: 'V-00.000.101',
      nombre: 'Persona De Prueba Uno',
      categoria: 'Controlador de tránsito aéreo',
      estado: null,
      diasRestantes: null,
      credencialCritica: null,
    })
  })
})
