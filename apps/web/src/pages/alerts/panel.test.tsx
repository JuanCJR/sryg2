// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AccessLog, Alert, AlertsSummary, AuthUser } from '@sryg/types'
import { sessionStore } from '../../common/services/session'
import { authorizationOf, mockApi, type MockHandler } from '../../test/api-mock'
import { chooseRowAction, rowActionLabels } from '../../test/row-actions'
import { TOKEN, currentLocation, renderApp, userWith } from '../../test/render-app'

const PERSON_A = '0b6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e11'
const PERSON_B = '1c7a2d4f-2a8b-4d2f-8e6f-3b7c9d0e1f22'
const ALERT_A = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
const ALERT_B = '8d0f7780-8536-41ef-a55c-f18ad2a01bf8'

const ALERTS: Alert[] = [
  {
    id: ALERT_A,
    personalId: PERSON_A,
    personnel: { cedula: 'V-00.000.101', firstNames: 'Persona', lastNames: 'De Prueba Uno' },
    credentialKind: 'licencia',
    credentialId: '9e1a8891-9647-42f0-b66d-0a9be3b12c09',
    area: 'licencias',
    kind: 'vencida',
    dueDate: '2026-10-12',
    acknowledgedBy: null,
    acknowledgedAt: null,
    createdAt: '2026-10-13T00:00:00.000Z',
  },
  {
    id: ALERT_B,
    personalId: PERSON_B,
    personnel: { cedula: 'V-00.000.202', firstNames: 'Ficticia', lastNames: 'De Prueba Dos' },
    credentialKind: 'habilitacion_tipo',
    credentialId: 'af2b99a2-a758-4301-877e-1bacf4c23d10',
    area: 'licencias',
    kind: 'proxima',
    dueDate: '2026-10-25',
    acknowledgedBy: null,
    acknowledgedAt: null,
    createdAt: '2026-10-13T00:00:00.000Z',
  },
]

const SUMMARY: AlertsSummary = {
  total: 7,
  byKind: { vencida: 3, proxima: 4 },
  byAcknowledgement: { pending: 7, acknowledged: 0 },
  byCredentialKind: { licencia: 2, habilitacion_tipo: 3, habilitacion_clase: 2, certificado_medico: 0 },
  byArea: { licencias: 7, medicina: 0 },
}

const LOG: AccessLog = {
  successful: [{ at: '2026-10-13T16:05:00.000Z', ip: '198.51.100.7' }],
  failed: [{ at: '2026-10-11T02:30:00.000Z', ip: '203.0.113.9' }],
}

const page = (items: Alert[], total = items.length, pageNumber = 1, pageSize = 20) => ({
  status: 200,
  body: { items, page: pageNumber, pageSize, total },
})

/** Routes /me, the alerts list, its summary and the access log; `api` may override any of them. */
function signIn(user: AuthUser, api: MockHandler = () => undefined) {
  sessionStore.set(TOKEN)
  return mockApi((url, init) => {
    const override = api(url, init)
    if (override) return override
    if (url.pathname === '/api/auth/me') return { status: 200, body: user }
    if (url.pathname === '/api/auth/me/access-log') return { status: 200, body: LOG }
    if (url.pathname === '/api/alerts/summary') return { status: 200, body: SUMMARY }
    if (url.pathname === '/api/alerts') return page(ALERTS)
    return undefined
  })
}

const callsTo = (api: ReturnType<typeof mockApi>, path: string) =>
  api.mock.calls.map(([url]) => new URL(String(url))).filter((url) => url.pathname === path)
const lastCall = (api: ReturnType<typeof mockApi>, path: string) => callsTo(api, path).at(-1)!
const paramsOf = (url: URL) => Object.fromEntries(url.searchParams.entries())

beforeEach(() => {
  // Day used for "vence en N días": the API also counts in UTC calendar days.
  vi.useFakeTimers({ now: new Date('2026-10-15T12:00:00.000Z'), toFake: ['Date'] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  sessionStore.clear()
})

describe('/panel (ALR-03)', () => {
  it('lists the open alerts with holder, credential, area and due date', async () => {
    signIn(userWith('administrador', 'ambas'))
    renderApp('/panel')

    expect(await screen.findByRole('heading', { level: 1, name: 'Panel' })).toBeTruthy()
    const list = await screen.findByRole('list', { name: 'Alertas de vencimiento' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(2)

    const first = within(rows[0]!)
    expect(first.getByText('Vencida')).toBeTruthy()
    expect(first.getByText('Licencia')).toBeTruthy()
    expect(first.getByRole('link', { name: /Persona De Prueba Uno/ }).getAttribute('href')).toBe(
      `/personal/${PERSON_A}`,
    )
    expect(first.getByText('V-00.000.101')).toBeTruthy()
    expect(first.getByText('12/10/2026')).toBeTruthy()
    expect(first.getByText('Venció hace 3 días')).toBeTruthy()

    const second = within(rows[1]!)
    expect(second.getByText('Próxima a vencer')).toBeTruthy()
    expect(second.getByText('Habilitación de tipo')).toBeTruthy()
    expect(second.getByText('Vence en 10 días')).toBeTruthy()
  })

  it('orders the columns ID, Titular, Credencial, Área, Vencimiento, Estado, Reconocimiento', async () => {
    signIn(userWith('administrador', 'ambas'))
    renderApp('/panel')

    const list = await screen.findByRole('list', { name: 'Alertas de vencimiento' })
    const header = list.previousElementSibling!
    expect(Array.from(header.children).map((cell) => cell.textContent)).toEqual([
      'Cédula',
      'Titular',
      'Credencial',
      'Área',
      'Vencimiento',
      'Estado',
      'Reconocimiento',
    ])
    const cells = Array.from(within(list).getAllByRole('listitem')[0]!.children).map((cell) => cell.textContent)
    expect(cells[0]).toBe('V-00.000.101')
    expect(cells[1]).toBe('Persona De Prueba Uno')
    expect(cells[2]).toBe('Licencia')
    expect(cells[5]).toContain('Vencida')
  })

  it('pages the alerts on the server with the range line and a rows-per-page choice', async () => {
    const api = signIn(userWith('administrador', 'ambas'), (url) => {
      if (url.pathname !== '/api/alerts') return undefined
      const p = url.searchParams
      return page(ALERTS, 45, Number(p.get('page')), Number(p.get('pageSize')))
    })
    renderApp('/panel')
    const user = userEvent.setup()

    await screen.findByRole('list', { name: 'Alertas de vencimiento' })
    const nav = screen.getByRole('navigation', { name: 'Paginación' })
    expect(nav.textContent).toContain('Mostrando 1–20 de 45')
    await user.click(within(nav).getByRole('button', { name: 'Página 3' }))
    await waitFor(() => expect(lastCall(api, '/api/alerts').searchParams.get('page')).toBe('3'))
    expect((await screen.findByRole('navigation', { name: 'Paginación' })).textContent).toContain(
      'Mostrando 41–45 de 45',
    )

    await user.selectOptions(
      within(screen.getByRole('navigation', { name: 'Paginación' })).getByLabelText('Filas por página'),
      '50',
    )
    await waitFor(() => expect(paramsOf(lastCall(api, '/api/alerts'))).toMatchObject({ page: '1', pageSize: '50' }))
  })

  it('shows the pending counts per kind on the annunciator', async () => {
    signIn(userWith('administrador', 'ambas'))
    renderApp('/panel')

    const annunciator = await screen.findByRole('group', { name: 'Resumen de alertas' })
    await waitFor(() => expect(within(annunciator).getByRole('button', { name: /Vencida\s*3/ })).toBeTruthy())
    expect(within(annunciator).getByRole('button', { name: /Próxima a vencer\s*4/ })).toBeTruthy()
  })

  it('asks only for pending alerts, of every area, for the Admin (D1, D24)', async () => {
    const api = signIn(userWith('administrador', 'ambas'))
    renderApp('/panel')

    await screen.findByRole('list', { name: 'Alertas de vencimiento' })
    expect(paramsOf(lastCall(api, '/api/alerts'))).toEqual({ acknowledged: 'false', page: '1', pageSize: '20' })
    expect(paramsOf(lastCall(api, '/api/alerts/summary'))).toEqual({ acknowledged: 'false' })
    expect(authorizationOf(api.mock.calls[0]![1])).toBe(`Bearer ${TOKEN}`)
  })

  it.each([
    ['supervisor', 'licencias'],
    ['supervisor', 'medicina'],
    ['consulta', 'medicina'],
  ] as const)(
    'starts a %s of %s on the alerts of their area, and lets them read the other (D24)',
    async (role, area) => {
      const api = signIn(userWith(role, area))
      renderApp('/panel')

      await screen.findByRole('list', { name: 'Alertas de vencimiento' })
      expect(lastCall(api, '/api/alerts').searchParams.get('area')).toBe(area)
      expect(lastCall(api, '/api/alerts/summary').searchParams.get('area')).toBe(area)

      const own = screen.getByRole('checkbox', { name: area === 'licencias' ? 'Licencias' : 'Medicina' })
      expect(own).toHaveProperty('checked', true)
      await userEvent.setup().click(own)
      await waitFor(() => expect(lastCall(api, '/api/alerts').searchParams.has('area')).toBe(false))
      expect(lastCall(api, '/api/alerts/summary').searchParams.has('area')).toBe(false)
    },
  )

  it('filters by kind with the annunciator keys and clears on a second press', async () => {
    const api = signIn(userWith('administrador', 'ambas'))
    renderApp('/panel')
    const user = userEvent.setup()

    const annunciator = await screen.findByRole('group', { name: 'Resumen de alertas' })
    const vencida = await within(annunciator).findByRole('button', { name: /Vencida\s*3/ })
    await user.click(vencida)
    await waitFor(() => expect(lastCall(api, '/api/alerts').searchParams.get('kind')).toBe('vencida'))
    expect(vencida.getAttribute('aria-pressed')).toBe('true')
    // The annunciator keeps counting both kinds.
    expect(lastCall(api, '/api/alerts/summary').searchParams.has('kind')).toBe(false)

    await user.click(await within(annunciator).findByRole('button', { name: /Vencida\s*3/ }))
    await waitFor(() => expect(lastCall(api, '/api/alerts').searchParams.has('kind')).toBe(false))
  })

  it('filters by credential type and by acknowledgement', async () => {
    const api = signIn(userWith('administrador', 'ambas'))
    renderApp('/panel')
    const user = userEvent.setup()

    await screen.findByRole('list', { name: 'Alertas de vencimiento' })
    // Ratings are not offered as a credential filter.
    expect(screen.queryByRole('checkbox', { name: 'Habilitación de tipo' })).toBeNull()
    expect(screen.queryByRole('checkbox', { name: 'Habilitación de clase' })).toBeNull()
    await user.click(screen.getByRole('checkbox', { name: 'Certificado médico' }))
    await waitFor(() =>
      expect(lastCall(api, '/api/alerts').searchParams.get('credentialKind')).toBe('certificado_medico'),
    )
    expect(lastCall(api, '/api/alerts/summary').searchParams.get('credentialKind')).toBe('certificado_medico')

    // Several values reach the API as one comma-joined parameter, in the options' order.
    await user.click(screen.getByRole('checkbox', { name: 'Licencia' }))
    await waitFor(() =>
      expect(lastCall(api, '/api/alerts').searchParams.get('credentialKind')).toBe('licencia,certificado_medico'),
    )
    await user.click(screen.getByRole('checkbox', { name: 'Medicina' }))
    await user.click(screen.getByRole('checkbox', { name: 'Licencias' }))
    await waitFor(() => expect(lastCall(api, '/api/alerts').searchParams.get('area')).toBe('licencias,medicina'))

    // Pending is the default; both boxes (or none) mean every alert.
    expect(screen.getByRole('checkbox', { name: 'Pendientes' })).toHaveProperty('checked', true)
    await user.click(screen.getByRole('checkbox', { name: 'Reconocidas' }))
    await waitFor(() => expect(lastCall(api, '/api/alerts').searchParams.has('acknowledged')).toBe(false))
    await user.click(screen.getByRole('checkbox', { name: 'Pendientes' }))
    await waitFor(() => expect(lastCall(api, '/api/alerts').searchParams.get('acknowledged')).toBe('true'))
    expect(lastCall(api, '/api/alerts').searchParams.get('page')).toBe('1')

    await user.click(screen.getByRole('button', { name: 'Limpiar todo' }))
    await waitFor(() => expect(paramsOf(lastCall(api, '/api/alerts'))).toEqual({ page: '1', pageSize: '20' }))
  })

  it('acknowledges an alert and reloads the list and the counts (ALR-06)', async () => {
    let acknowledged = false
    const api = signIn(userWith('supervisor', 'licencias'), (url, init) => {
      if (url.pathname === `/api/alerts/${ALERT_A}/acknowledge` && init.method === 'POST') {
        acknowledged = true
        return { status: 200, body: { ...ALERTS[0], acknowledgedAt: '2026-10-15T12:00:00.000Z' } }
      }
      if (url.pathname === '/api/alerts' && acknowledged) return page([ALERTS[1]!])
      return undefined
    })
    renderApp('/panel')
    const user = userEvent.setup()

    const list = await screen.findByRole('list', { name: 'Alertas de vencimiento' })
    const listCalls = callsTo(api, '/api/alerts').length
    const summaryCalls = callsTo(api, '/api/alerts/summary').length
    await chooseRowAction(
      user,
      within(list).getAllByRole('button', { name: /^Acciones de la alerta/ })[0]!,
      'Reconocer alerta',
    )

    expect(await screen.findByText('Alerta reconocida.')).toBeTruthy()
    const ack = callsTo(api, `/api/alerts/${ALERT_A}/acknowledge`)
    expect(ack).toHaveLength(1)
    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: 'Alertas de vencimiento' })).getAllByRole('listitem'),
      ).toHaveLength(1),
    )
    expect(callsTo(api, '/api/alerts').length).toBeGreaterThan(listCalls)
    expect(callsTo(api, '/api/alerts/summary').length).toBeGreaterThan(summaryCalls)
  })

  it('names the alert on its actions menu, which offers to acknowledge it or open the file', async () => {
    signIn(userWith('administrador', 'ambas'))
    renderApp('/panel')

    const list = await screen.findByRole('list', { name: 'Alertas de vencimiento' })
    const trigger = within(list).getByRole('button', {
      name: 'Acciones de la alerta de Licencia de Persona De Prueba Uno',
    })
    expect(await rowActionLabels(userEvent.setup(), trigger)).toEqual(['Reconocer alerta', 'Ver expediente'])
  })

  it('explains a 409 (already acknowledged) and reloads', async () => {
    const api = signIn(userWith('administrador', 'ambas'), (url, init) =>
      url.pathname.endsWith('/acknowledge') && init.method === 'POST'
        ? { status: 409, body: { statusCode: 409, message: 'Alert already acknowledged' } }
        : undefined,
    )
    renderApp('/panel')

    const list = await screen.findByRole('list', { name: 'Alertas de vencimiento' })
    const before = callsTo(api, '/api/alerts').length
    await chooseRowAction(
      userEvent.setup(),
      within(list).getAllByRole('button', { name: /^Acciones de la alerta/ })[0]!,
      'Reconocer alerta',
    )

    expect(await screen.findByText('Otra persona ya había reconocido esta alerta.')).toBeTruthy()
    await waitFor(() => expect(callsTo(api, '/api/alerts').length).toBeGreaterThan(before))
  })

  it('shows who acknowledged and when, without the action, for acknowledged alerts', async () => {
    signIn(userWith('administrador', 'ambas'), (url) =>
      url.pathname === '/api/alerts'
        ? page([
            {
              ...ALERTS[0]!,
              acknowledgedBy: '3f2b6a1c-8d4e-4f5a-9b6c-7d8e9f0a1b2c',
              acknowledgedAt: '2026-10-14T13:30:00.000Z',
            },
          ])
        : undefined,
    )
    renderApp('/panel')

    const list = await screen.findByRole('list', { name: 'Alertas de vencimiento' })
    expect(within(list).getByText('Reconocida el 14/10/2026 · 09:30')).toBeTruthy()
    expect(within(list).queryByRole('button', { name: /^Acciones de la alerta/ })).toBeNull()
  })

  it('shows an empty state when there are no pending alerts', async () => {
    signIn(userWith('administrador', 'ambas'), (url) => (url.pathname === '/api/alerts' ? page([]) : undefined))
    renderApp('/panel')

    expect(await screen.findByText('Sin alertas pendientes')).toBeTruthy()
  })

  it('shows a load error with a retry that asks again', async () => {
    let fail = true
    const api = signIn(userWith('administrador', 'ambas'), (url) =>
      url.pathname === '/api/alerts' && fail ? { status: 500, body: { statusCode: 500, message: 'x' } } : undefined,
    )
    renderApp('/panel')

    expect(await screen.findByText('No se pudieron cargar las alertas')).toBeTruthy()
    fail = false
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('list', { name: 'Alertas de vencimiento' })).toBeTruthy()
    expect(callsTo(api, '/api/alerts').length).toBeGreaterThan(1)
  })

  it('shows the latest accesses and failed attempts of the user (D23)', async () => {
    signIn(userWith('consulta', 'ambas'))
    renderApp('/panel')

    const panel = await screen.findByRole('region', { name: 'Registro de accesos' })
    const accesses = await within(panel).findByRole('list', { name: 'Últimos accesos' })
    expect(within(accesses).getByText('198.51.100.7')).toBeTruthy()
    const failed = within(panel).getByRole('list', { name: 'Intentos fallidos' })
    expect(within(failed).getByText('203.0.113.9')).toBeTruthy()
  })

  it('links to the reports for roles that read them', async () => {
    signIn(userWith('consulta', 'licencias'))
    renderApp('/panel')

    const link = await screen.findByRole('link', { name: 'Ver reportes' })
    expect(link.getAttribute('href')).toBe('/reportes')
    await userEvent.setup().click(link)
    expect(currentLocation()).toBe('/reportes')
  })
})
