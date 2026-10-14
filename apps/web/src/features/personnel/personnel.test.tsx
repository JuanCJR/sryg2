// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AuthUser, PersonnelDto } from '@sryg/types'
import { sessionStore } from '../../shared/session/session'
import { mockApi, type MockHandler } from '../../test/api-mock'
import { TOKEN, renderApp, userWith } from '../../test/render-app'

const PERSON: PersonnelDto = {
  id: '0b6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e11',
  cedula: 'V-00.000.101',
  firstNames: 'Persona',
  lastNames: 'De Prueba Uno',
  documentTypeId: null,
  nationalityId: null,
  birthDate: '1990-04-02',
  address: 'Dirección ficticia 1',
  email: 'persona.prueba@sryg.test',
  phone: null,
  bloodType: 'o_pos',
  cargo: null,
  dependencia: null,
  category: 'piloto_comercial',
  status: 'activo',
  hasPhoto: false,
  hasSignature: false,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-02T13:05:00.000Z',
}

function signIn(user: AuthUser, api: MockHandler) {
  sessionStore.set(TOKEN)
  return mockApi((url, init) => (url.pathname === '/api/auth/me' ? { status: 200, body: user } : api(url, init)))
}

const page = (items: PersonnelDto[], total = items.length) => ({
  status: 200,
  body: { items, page: 1, pageSize: 25, total },
})

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.clear()
})

describe('Listado de personal on the API', () => {
  it('shows the empty state when the registry holds nobody', async () => {
    signIn(userWith('consulta', 'licencias'), () => page([]))
    renderApp('/personal')
    expect(await screen.findByText('Aún no hay personal registrado')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Nuevo personal' })).toBeNull()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    signIn(userWith('supervisor', 'licencias'), () => (fail ? { status: 503, body: { message: 'x' } } : page([PERSON])))
    const user = userEvent.setup()
    renderApp('/personal')

    expect(await screen.findByText('No se pudo cargar el personal')).toBeTruthy()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Escriba un nombre o una cédula')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Nuevo personal' })).toBeTruthy()
  })

  it('searches by name or cédula on the server and links each row to its Expediente', async () => {
    const api = signIn(userWith('supervisor', 'licencias'), (url) =>
      url.searchParams.get('q') === 'prueba' ? page([PERSON]) : page([PERSON], 40),
    )
    const user = userEvent.setup()
    renderApp('/personal')

    await user.type(await screen.findByLabelText('Buscar por nombre o cédula'), 'prueba')
    const row = await screen.findByRole('link', { name: /Persona De Prueba Uno/ })
    expect(row.getAttribute('href')).toBe(`/personal/${PERSON.id}`)
    expect(row.textContent).toContain('Piloto comercial')
    expect(row.textContent).toContain('Sin datos')
    const search = api.mock.calls.map(([url]) => new URL(String(url))).find((url) => url.searchParams.get('q'))
    expect(search?.searchParams.get('pageSize')).toBe('25')
  })

  it('says when a search matches nobody', async () => {
    signIn(userWith('consulta', 'medicina'), (url) => (url.searchParams.get('q') ? page([]) : page([PERSON])))
    const user = userEvent.setup()
    renderApp('/personal')

    await user.type(await screen.findByLabelText('Buscar por nombre o cédula'), 'nadie')
    expect(await screen.findByText('Sin resultados para esta búsqueda')).toBeTruthy()
  })
})

describe('Expediente on the API', () => {
  const personnelApi: MockHandler = (url) =>
    url.pathname === `/api/personnel/${PERSON.id}` ? { status: 200, body: PERSON } : undefined

  it('shows the record on the Datos page key, with one tab per feature', async () => {
    signIn(userWith('supervisor', 'licencias'), personnelApi)
    renderApp(`/personal/${PERSON.id}`)

    expect(await screen.findByRole('heading', { name: 'V-00.000.101', level: 1 })).toBeTruthy()
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Datos',
      'Documentos',
      'Licencias',
      'Médico',
      'Bloqueos',
      'Historial',
    ])
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByText('De Prueba Uno')).toBeTruthy()
    expect(within(panel).getByText('02 abr 1990')).toBeTruthy()
  })

  it('enables "Editar datos" and shows unbuilt actions disabled as "Próximamente", per role and area (D24)', async () => {
    signIn(userWith('supervisor', 'medicina'), personnelApi)
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}`)

    expect((await screen.findByRole('button', { name: 'Editar datos' })).hasAttribute('disabled')).toBe(false)
    expect(screen.queryByRole('button', { name: /Emitir o renovar/ })).toBeNull()

    await user.click(screen.getByRole('tab', { name: 'Médico' }))
    // Built by W1-6: the action is live for the Medicina Supervisor.
    expect(screen.getByRole('button', { name: /Registrar o renovar certificado/ }).hasAttribute('disabled')).toBe(false)
  })

  it('hides the Historial and every action from Consulta', async () => {
    signIn(userWith('consulta', 'ambas'), personnelApi)
    renderApp(`/personal/${PERSON.id}?pagina=historial`)

    await screen.findByRole('heading', { name: 'V-00.000.101', level: 1 })
    expect(screen.queryByRole('tab', { name: 'Historial' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Datos' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByRole('button', { name: /Próximamente/ })).toBeNull()
  })

  it('answers 404 for an unknown person and offers a retry when the API fails', async () => {
    signIn(userWith('consulta', 'licencias'), () => undefined)
    const { unmount } = renderApp('/personal/0b6f1c3e-0000-4c1e-9d5e-2a6b8c9d0e11')
    expect(await screen.findByRole('heading', { name: 'Persona no encontrada' })).toBeTruthy()
    unmount()

    signIn(userWith('consulta', 'licencias'), () => ({ status: 500, body: { message: 'x' } }))
    renderApp(`/personal/${PERSON.id}`)
    await waitFor(() => expect(screen.getByText('No se pudo cargar el expediente')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })
})
