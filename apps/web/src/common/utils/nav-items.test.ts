import { describe, expect, it } from 'vitest'
import { visibleNavGroups } from './nav-items'

const paths = (role: Parameters<typeof visibleNavGroups>[0], area: Parameters<typeof visibleNavGroups>[1]) =>
  Object.fromEntries(visibleNavGroups(role, area).map((group) => [group.id, group.items.map((item) => item.path)]))

describe('visibleNavGroups (D1, D24)', () => {
  it('shows the Admin every group, including Administración', () => {
    expect(Object.keys(paths('administrador', 'ambas'))).toEqual(['general', 'licencias', 'medicina', 'administracion'])
    expect(paths('administrador', 'licencias').administracion).toEqual(['/catalogos', '/usuarios', '/parametros'])
  })

  it('shows a Supervisor only the group of their area, and no Administración', () => {
    expect(Object.keys(paths('supervisor', 'licencias'))).toEqual(['general', 'licencias'])
    expect(Object.keys(paths('supervisor', 'medicina'))).toEqual(['general', 'medicina'])
    expect(Object.keys(paths('supervisor', 'ambas'))).toEqual(['general', 'licencias', 'medicina'])
  })

  it('hides from Consulta what the matrix does not let it read', () => {
    expect(paths('consulta', 'licencias').general).toEqual(['/panel', '/personal', '/bloqueos', '/reportes'])
    expect(paths('supervisor', 'licencias').general).toContain('/auditoria')
  })

  it('never lists the removed backups page (D11)', () => {
    const all = visibleNavGroups('administrador', 'ambas').flatMap((group) => group.items.map((item) => item.path))
    expect(all).not.toContain('/respaldos')
  })
})
