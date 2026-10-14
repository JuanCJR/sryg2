import { describe, expect, it } from 'vitest'
import { USER_AREAS, ROLES } from './enums'
import { can, PERMISSION_ACTIONS, PERMISSION_MATRIX, PERMISSION_MODULES } from './permissions'

describe('can (D1, D24)', () => {
  it('describes every module of the matrix', () => {
    expect(Object.keys(PERMISSION_MATRIX).sort()).toEqual([...PERMISSION_MODULES].sort())
  })

  it('lets every role read personnel, licenses, medical certificates, blocks, alerts, reports and catalogs', () => {
    const readable = [
      'personnel',
      'licenses',
      'medical_certificates',
      'blocking',
      'alerts',
      'reports',
      'catalogs',
    ] as const
    for (const role of ROLES)
      for (const area of USER_AREAS)
        for (const module of readable) expect(can(role, area, module, 'read'), `${role}/${area}/${module}`).toBe(true)
  })

  it('never lets Consulta write or export anything', () => {
    for (const area of USER_AREAS)
      for (const module of PERMISSION_MODULES)
        for (const action of PERMISSION_ACTIONS.filter((a) => a !== 'read'))
          expect(can('consulta', area, module, action), `${area}/${module}/${action}`).toBe(false)
  })

  it('keeps the audit viewer away from Consulta and users, settings and backups for Admin only', () => {
    expect(can('consulta', 'ambas', 'audit', 'read')).toBe(false)
    expect(can('supervisor', 'licencias', 'audit', 'read')).toBe(true)
    for (const module of ['users', 'settings', 'backups'] as const) {
      expect(can('administrador', 'ambas', module, 'read')).toBe(true)
      expect(can('supervisor', 'ambas', module, 'read')).toBe(false)
    }
    expect(can('administrador', 'licencias', 'users', 'write')).toBe(true)
    expect(can('administrador', 'medicina', 'settings', 'write')).toBe(true)
  })

  it('does not restrict the Admin by area', () => {
    for (const area of USER_AREAS)
      for (const module of ['personnel', 'licenses', 'medical_certificates', 'blocking', 'catalogs'] as const)
        expect(can('administrador', area, module, 'write'), `${area}/${module}`).toBe(true)
  })

  it('lets a Supervisor write only in their area (D24)', () => {
    expect(can('supervisor', 'licencias', 'licenses', 'write')).toBe(true)
    expect(can('supervisor', 'licencias', 'medical_certificates', 'write')).toBe(false)
    expect(can('supervisor', 'medicina', 'medical_certificates', 'write')).toBe(true)
    expect(can('supervisor', 'medicina', 'licenses', 'write')).toBe(false)
    expect(can('supervisor', 'ambas', 'licenses', 'write')).toBe(true)
    expect(can('supervisor', 'ambas', 'medical_certificates', 'write')).toBe(true)
  })

  it('lets a Supervisor of any area write personnel and blocks (D2, D24)', () => {
    for (const area of USER_AREAS) {
      expect(can('supervisor', area, 'personnel', 'write')).toBe(true)
      expect(can('supervisor', area, 'blocking', 'write')).toBe(true)
    }
  })

  it('reserves catalog writes for the Admin', () => {
    expect(can('supervisor', 'ambas', 'catalogs', 'write')).toBe(false)
  })

  it('lets Admin and Supervisor export reports and credentials', () => {
    for (const role of ['administrador', 'supervisor'] as const) {
      expect(can(role, 'licencias', 'reports', 'export')).toBe(true)
      expect(can(role, 'medicina', 'credentials', 'export')).toBe(true)
    }
  })
})
