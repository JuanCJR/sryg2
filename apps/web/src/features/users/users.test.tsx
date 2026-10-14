// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AuthUser, ManagedUser } from '@sryg/types'
import { sessionStore } from '../../shared/session/session'
import { mockApi, type MockHandler } from '../../test/api-mock'
import { TOKEN, renderApp, userWith } from '../../test/render-app'

// jsdom has no modal dialogs: open/close by attribute is enough for these tests.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
})

const ADMIN = userWith('administrador', 'ambas')
const STAMP = '2026-10-01T12:00:00.000Z'
const managed = (extra: Partial<ManagedUser>): ManagedUser => ({
  id: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  email: 'ana.prueba@sryg.test',
  fullName: 'Ana Prueba',
  role: 'supervisor',
  area: 'medicina',
  isActive: true,
  mustChangePassword: false,
  createdAt: STAMP,
  updatedAt: STAMP,
  ...extra,
})
const ANA = managed({})
const LUIS = managed({
  id: '1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e',
  email: 'luis.prueba@sryg.test',
  fullName: 'Luis Prueba',
  role: 'administrador',
  area: 'ambas',
})
const INES = managed({
  id: '2c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e6f',
  email: 'ines.prueba@sryg.test',
  fullName: 'Inés Prueba',
  role: 'consulta',
  area: 'licencias',
  isActive: false,
  mustChangePassword: true,
})

const page = (items: ManagedUser[]) => ({ status: 200, body: { items, page: 1, pageSize: 25, total: items.length } })

function signIn(user: AuthUser, api: MockHandler) {
  sessionStore.set(TOKEN)
  return mockApi((url, init) => (url.pathname === '/api/auth/me' ? { status: 200, body: user } : api(url, init)))
}

const calls = (api: ReturnType<typeof mockApi>, method: string, path: string) =>
  api.mock.calls.filter(([url, init]) => new URL(String(url)).pathname === path && (init?.method ?? 'GET') === method)

const rowOf = async (name: string) => (await screen.findByText(name)).closest('tr') as HTMLElement

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.clear()
})

describe('Usuarios (AUTH-06, D1, D14, D24)', () => {
  it('lists users with role, area and state, and searches on the server', async () => {
    const api = signIn(ADMIN, (url) =>
      url.pathname === '/api/users' ? page(url.searchParams.get('q') ? [ANA] : [ANA, LUIS, INES]) : undefined,
    )
    const user = userEvent.setup()
    renderApp('/usuarios')

    expect(await screen.findByRole('heading', { name: 'Usuarios' })).toBeTruthy()
    const ana = await rowOf('Ana Prueba')
    expect(ana.textContent).toContain('ana.prueba@sryg.test')
    expect(ana.textContent).toContain('Supervisor')
    expect(ana.textContent).toContain('Medicina')
    expect(ana.textContent).toContain('Activo')
    const ines = await rowOf('Inés Prueba')
    expect(ines.textContent).toContain('Inactivo')
    expect(ines.textContent).toContain('Debe cambiar la contraseña')
    expect(within(ines).getByRole('button', { name: 'Activar' })).toBeTruthy()

    await user.type(screen.getByLabelText('Buscar por nombre o correo'), 'ana')
    await waitFor(() => expect(screen.queryByText('Luis Prueba')).toBeNull())
    expect(calls(api, 'GET', '/api/users').some(([url]) => new URL(String(url)).searchParams.get('q') === 'ana')).toBe(
      true,
    )
  })

  it('keeps non-Admins out (D1)', async () => {
    signIn(userWith('supervisor', 'ambas'), () => undefined)
    renderApp('/usuarios')
    expect(await screen.findByRole('heading', { name: 'Acceso restringido' })).toBeTruthy()
  })

  it('creates a user and shows the temporary password once', async () => {
    let items = [LUIS]
    const api = signIn(ADMIN, (url, init) => {
      if (url.pathname !== '/api/users') return undefined
      if (init.method === 'POST') {
        const created = managed({ ...JSON.parse(String(init.body)), mustChangePassword: true })
        items = [...items, created]
        return { status: 201, body: { user: created, temporaryPassword: 'Tmp7pass8Wrd' } }
      }
      return page(items)
    })
    const user = userEvent.setup()
    renderApp('/usuarios')

    await user.click(await screen.findByRole('button', { name: 'Nuevo usuario' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo usuario' })
    await user.type(within(dialog).getByLabelText('Correo'), 'ana.prueba@sryg.test')
    await user.type(within(dialog).getByLabelText('Nombre'), 'Ana Prueba')
    await user.selectOptions(within(dialog).getByLabelText('Rol'), 'supervisor')
    await user.selectOptions(within(dialog).getByLabelText('Área'), 'medicina')
    await user.click(within(dialog).getByRole('button', { name: 'Crear usuario' }))

    const shown = await screen.findByRole('dialog', { name: 'Contraseña temporal' })
    expect(within(shown).getByText('Tmp7pass8Wrd')).toBeTruthy()
    expect(shown.textContent).toContain('ana.prueba@sryg.test')
    expect(JSON.parse(String(calls(api, 'POST', '/api/users')[0]?.[1]?.body))).toEqual({
      email: 'ana.prueba@sryg.test',
      fullName: 'Ana Prueba',
      role: 'supervisor',
      area: 'medicina',
    })
    await user.click(within(shown).getByRole('button', { name: 'Listo' }))
    await waitFor(() => expect(screen.queryByText('Tmp7pass8Wrd')).toBeNull())
    expect(await screen.findByText('Ana Prueba')).toBeTruthy()
  })

  it('validates the form and shows a duplicate email on its field', async () => {
    const api = signIn(ADMIN, (url, init) => {
      if (url.pathname !== '/api/users') return undefined
      if (init.method === 'POST') return { status: 409, body: { statusCode: 409, error: 'Conflict', message: 'x' } }
      return page([LUIS])
    })
    const user = userEvent.setup()
    renderApp('/usuarios')

    await user.click(await screen.findByRole('button', { name: 'Nuevo usuario' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo usuario' })
    await user.click(within(dialog).getByRole('button', { name: 'Crear usuario' }))
    expect(within(dialog).getByText('Ingrese un correo válido.')).toBeTruthy()
    expect(within(dialog).getByText('Ingrese el nombre.')).toBeTruthy()
    expect(calls(api, 'POST', '/api/users')).toHaveLength(0)

    await user.type(within(dialog).getByLabelText('Correo'), 'luis.prueba@sryg.test')
    await user.type(within(dialog).getByLabelText('Nombre'), 'Otro Luis')
    await user.click(within(dialog).getByRole('button', { name: 'Crear usuario' }))
    expect(await within(dialog).findByText('Ya existe un usuario con este correo.')).toBeTruthy()
  })

  it('edits name, role and area', async () => {
    const api = signIn(ADMIN, (url, init) => {
      if (url.pathname === `/api/users/${ANA.id}` && init.method === 'PATCH')
        return { status: 200, body: { ...ANA, ...JSON.parse(String(init.body)) } }
      return url.pathname === '/api/users' ? page([ANA, LUIS]) : undefined
    })
    const user = userEvent.setup()
    renderApp('/usuarios')

    await user.click(within(await rowOf('Ana Prueba')).getByRole('button', { name: 'Editar' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar usuario' })
    expect((within(dialog).getByLabelText('Correo') as HTMLInputElement).disabled).toBe(true)
    const name = within(dialog).getByLabelText('Nombre')
    await user.clear(name)
    await user.type(name, 'Ana María Prueba')
    await user.selectOptions(within(dialog).getByLabelText('Rol'), 'consulta')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(calls(api, 'PATCH', `/api/users/${ANA.id}`)).toHaveLength(1))
    expect(JSON.parse(String(calls(api, 'PATCH', `/api/users/${ANA.id}`)[0]?.[1]?.body))).toEqual({
      fullName: 'Ana María Prueba',
      role: 'consulta',
      area: 'medicina',
    })
    expect(await screen.findByText('Usuario actualizado.')).toBeTruthy()
  })

  it('explains why the last active Admin cannot be demoted', async () => {
    signIn(ADMIN, (url, init) => {
      if (url.pathname === `/api/users/${LUIS.id}` && init.method === 'PATCH')
        return { status: 409, body: { statusCode: 409, error: 'Conflict', message: 'x' } }
      return url.pathname === '/api/users' ? page([LUIS]) : undefined
    })
    const user = userEvent.setup()
    renderApp('/usuarios')

    await user.click(within(await rowOf('Luis Prueba')).getByRole('button', { name: 'Editar' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar usuario' })
    await user.selectOptions(within(dialog).getByLabelText('Rol'), 'supervisor')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    expect(await within(dialog).findByText(/último Administrador activo/)).toBeTruthy()
  })

  it('resets a password after confirmation and shows the temporary one', async () => {
    const api = signIn(ADMIN, (url, init) => {
      if (url.pathname === `/api/users/${ANA.id}/reset-password` && init.method === 'POST')
        return { status: 200, body: { user: { ...ANA, mustChangePassword: true }, temporaryPassword: 'Nuev4Clave9x' } }
      return url.pathname === '/api/users' ? page([ANA]) : undefined
    })
    const user = userEvent.setup()
    renderApp('/usuarios')

    await user.click(within(await rowOf('Ana Prueba')).getByRole('button', { name: 'Restablecer contraseña' }))
    const confirm = await screen.findByRole('dialog', { name: 'Restablecer contraseña' })
    expect(confirm.textContent).toContain('Ana Prueba')
    await user.click(within(confirm).getByRole('button', { name: 'Restablecer' }))

    const shown = await screen.findByRole('dialog', { name: 'Contraseña temporal' })
    expect(within(shown).getByText('Nuev4Clave9x')).toBeTruthy()
    expect(calls(api, 'POST', `/api/users/${ANA.id}/reset-password`)).toHaveLength(1)
  })

  it('deactivates after confirmation, activates directly, and reports the last active Admin', async () => {
    const api = signIn(ADMIN, (url) => {
      if (url.pathname === `/api/users/${ANA.id}/deactivate`) return { status: 200, body: { ...ANA, isActive: false } }
      if (url.pathname === `/api/users/${INES.id}/activate`) return { status: 200, body: { ...INES, isActive: true } }
      if (url.pathname === `/api/users/${LUIS.id}/deactivate`)
        return { status: 409, body: { statusCode: 409, error: 'Conflict', message: 'x' } }
      return url.pathname === '/api/users' ? page([ANA, LUIS, INES]) : undefined
    })
    const user = userEvent.setup()
    renderApp('/usuarios')

    await user.click(within(await rowOf('Ana Prueba')).getByRole('button', { name: 'Desactivar' }))
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Desactivar usuario' })).getByRole('button', {
        name: 'Desactivar',
      }),
    )
    await waitFor(() => expect(calls(api, 'POST', `/api/users/${ANA.id}/deactivate`)).toHaveLength(1))

    await user.click(within(await rowOf('Inés Prueba')).getByRole('button', { name: 'Activar' }))
    await waitFor(() => expect(calls(api, 'POST', `/api/users/${INES.id}/activate`)).toHaveLength(1))

    await user.click(within(await rowOf('Luis Prueba')).getByRole('button', { name: 'Desactivar' }))
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Desactivar usuario' })).getByRole('button', {
        name: 'Desactivar',
      }),
    )
    expect(await screen.findByText(/No se puede desactivar al último Administrador activo/)).toBeTruthy()
  })
})
