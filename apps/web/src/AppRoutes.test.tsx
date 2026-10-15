// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AuthUser } from '@sryg/types'
import { sessionStore } from './common/services/session'
import { authorizationOf, mockApi } from './test/api-mock'
import { TOKEN, currentLocation, renderApp, userWith } from './test/render-app'

/** The fictitious API: login, /me for `user`, and an empty registry. */
function mockSession(user: AuthUser, meStatus = 200) {
  return mockApi((url, init) => {
    if (url.pathname === '/api/auth/login' && init.method === 'POST') {
      return { status: 200, body: { accessToken: TOKEN, expiresIn: 3600, user } }
    }
    if (url.pathname === '/api/auth/me') {
      return meStatus === 200 ? { status: 200, body: user } : { status: meStatus, body: { message: 'x' } }
    }
    if (url.pathname === '/api/personnel') return { status: 200, body: { items: [], page: 1, pageSize: 1, total: 0 } }
    return undefined
  })
}

const location = currentLocation
/** The desktop rail (the phone drawer repeats the same links). */
const rail = async () => (await screen.findAllByRole('navigation', { name: 'Navegación principal' }))[0]!
const groupNames = async () =>
  within(await rail())
    .getAllByRole('group')
    .map((group) => group.getAttribute('aria-label'))
    .filter(Boolean)
const railLinks = async () =>
  within(await rail())
    .getAllByRole('link')
    .map((link) => link.textContent)

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.clear()
})

describe('session and navigation (D4, D12, D24)', () => {
  it('logs in, loads /me with the token and returns to the page that asked for the login', async () => {
    const api = mockSession(userWith('supervisor', 'licencias'))
    const user = userEvent.setup()
    renderApp('/personal')

    await waitFor(() => expect(location()).toBe('/ingreso?next=%2Fpersonal'))
    await user.type(screen.getByLabelText('Correo'), 'usuario.prueba@sryg.test')
    await user.type(screen.getByLabelText('Contraseña'), 'clave-ficticia')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('heading', { name: 'Personal', level: 1 })).toBeTruthy()
    expect(location()).toBe('/personal')
    const me = api.mock.calls.find(([url]) => String(url).endsWith('/api/auth/me'))
    expect(authorizationOf(me?.[1])).toBe(`Bearer ${TOKEN}`)
    expect(screen.getAllByText('Usuario De Prueba').length).toBeGreaterThan(0)
  })

  it('shows a Supervisor de Licencias the Licencias group only, with Auditoría and without Administración', async () => {
    mockSession(userWith('supervisor', 'licencias'))
    sessionStore.set(TOKEN)
    renderApp('/panel')

    expect(await groupNames()).toEqual(['Licencias'])
    expect(await railLinks()).toEqual([
      'PanelPanel',
      'PersonalPersonal',
      'BloqueosBloqueos',
      'ReportesReportes',
      'AuditoríaAuditoría',
      'Consulta de licenciasLicencias',
    ])
  })

  it('shows a Consulta de Medicina the Medicina group, without Auditoría', async () => {
    mockSession(userWith('consulta', 'medicina'))
    sessionStore.set(TOKEN)
    renderApp('/panel')

    expect(await groupNames()).toEqual(['Medicina'])
    expect((await railLinks()).join(' ')).not.toContain('Auditoría')
  })

  it('shows the Admin both areas and Administración', async () => {
    mockSession(userWith('administrador', 'ambas'))
    sessionStore.set(TOKEN)
    renderApp('/panel')

    expect(await groupNames()).toEqual(['Licencias', 'Medicina', 'Administración'])
    const admin = within(await rail()).getByRole('group', { name: 'Administración' })
    expect(
      within(admin)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/catalogos', '/usuarios', '/parametros'])
  })

  it('answers 403 when the area does not allow the page (D24)', async () => {
    mockSession(userWith('supervisor', 'licencias'))
    sessionStore.set(TOKEN)
    renderApp('/personal/3f2b6a1c-8d4e-4f5a-9b6c-7d8e9f0a1b2c/certificado-medico')

    expect(await screen.findByText('403')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Acceso restringido' })).toBeTruthy()
  })

  it('answers 404 for an unknown route and redirects / to /panel (D16)', async () => {
    mockSession(userWith('consulta', 'licencias'))
    sessionStore.set(TOKEN)
    const { unmount } = renderApp('/no-existe')
    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeTruthy()
    unmount()

    renderApp('/')
    await waitFor(() => expect(location()).toBe('/panel'))
  })

  it('keeps a user with a forced password change on /perfil (D4)', async () => {
    mockSession(userWith('supervisor', 'medicina', { mustChangePassword: true }))
    sessionStore.set(TOKEN)
    renderApp('/personal')

    await waitFor(() => expect(location()).toBe('/perfil'))
    expect(await screen.findByRole('heading', { name: 'Perfil' })).toBeTruthy()
  })

  it('clears the session on a 401 and goes back to the login with next', async () => {
    mockSession(userWith('supervisor', 'licencias'), 401)
    sessionStore.set(TOKEN)
    renderApp('/bloqueos')

    await waitFor(() => expect(location()).toBe('/ingreso?next=%2Fbloqueos'))
    expect(sessionStore.get()).toBeNull()
  })

  it('logs out from the shell', async () => {
    mockSession(userWith('administrador', 'ambas'))
    sessionStore.set(TOKEN)
    const user = userEvent.setup()
    renderApp('/panel')

    await user.click(await screen.findByRole('button', { name: /Usuario De Prueba/ }))
    await user.click(within(screen.getByRole('menu')).getByRole('button', { name: 'Cerrar sesión' }))

    await waitFor(() => expect(location()).toBe('/ingreso'))
    expect(sessionStore.get()).toBeNull()
  })

  it('renders /verificar/:token without a session and without the shell', async () => {
    mockApi(() => undefined)
    renderApp('/verificar/9c1d2e3f-ficticio')

    expect(await screen.findByRole('heading', { name: 'Verificación de credencial' })).toBeTruthy()
    expect(screen.queryByRole('navigation')).toBeNull()
  })
})
