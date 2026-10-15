// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AuthUser, BlockDto, PersonnelDto } from '@sryg/types'
import { sessionStore } from '../../shared/session/session'
import { mockApi, type MockHandler } from '../../test/api-mock'
import { TOKEN, renderApp, userWith } from '../../test/render-app'

const PERSON: PersonnelDto = {
  id: '0b6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e11',
  cedula: '10000101',
  firstNames: 'Persona',
  lastNames: 'De Prueba Uno',
  documentTypeId: null,
  nationalityId: null,
  birthDate: '1990-04-02',
  address: null,
  email: null,
  phone: null,
  bloodType: null,
  cargo: null,
  dependencia: null,
  category: 'piloto_comercial',
  status: 'activo',
  hasPhoto: false,
  hasSignature: false,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-02T13:05:00.000Z',
}

const REGISTRAR = { id: '5a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d', fullName: 'Supervisora Ficticia' }

function block(overrides: Partial<BlockDto> & Pick<BlockDto, 'id'>): BlockDto {
  return {
    personalId: PERSON.id,
    person: { cedula: PERSON.cedula, firstNames: PERSON.firstNames, lastNames: PERSON.lastNames },
    type: 'medico',
    reason: 'Impedimento médico ficticio',
    status: 'activo',
    createdBy: REGISTRAR,
    createdAt: '2026-10-05T14:30:00.000Z',
    resolvedBy: null,
    resolvedAt: null,
    resolutionNote: null,
    updatedAt: '2026-10-05T14:30:00.000Z',
    ...overrides,
  }
}

const ACTIVE = block({ id: 'aa000000-0000-4000-8000-000000000001' })
const RESOLVED = block({
  id: 'bb000000-0000-4000-8000-000000000002',
  type: 'administrativo',
  reason: 'Documento vencido ficticio',
  status: 'resuelto',
  resolvedBy: REGISTRAR,
  resolvedAt: '2026-10-06T09:00:00.000Z',
  resolutionNote: 'Documento consignado',
})

/** A fictitious blocks API over an in-memory list, with the same filters as the real one. */
function blocksServer(initial: BlockDto[]) {
  const rows = [...initial]
  let seq = 0
  const handler: MockHandler = (url, init) => {
    if (url.pathname === `/api/personnel/${PERSON.id}`) return { status: 200, body: PERSON }
    if (url.pathname === '/api/blocks' && (init.method ?? 'GET') === 'GET') {
      const p = url.searchParams
      const q = p.get('q')?.toLowerCase()
      const statuses = p.get('status')?.split(',')
      const types = p.get('type')?.split(',')
      const matching = rows.filter(
        (b) =>
          (!statuses || statuses.includes(b.status)) &&
          (!types || types.includes(b.type)) &&
          (!p.get('personalId') || b.personalId === p.get('personalId')) &&
          (!q || `${b.person.firstNames} ${b.person.lastNames} ${b.person.cedula}`.toLowerCase().includes(q)),
      )
      const page = Number(p.get('page') ?? 1)
      const pageSize = Number(p.get('pageSize') ?? 20)
      const items = matching.slice((page - 1) * pageSize, page * pageSize)
      return { status: 200, body: { items, page, pageSize, total: matching.length } }
    }
    if (url.pathname === '/api/blocks' && init.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { personalId: string; type: BlockDto['type']; reason: string }
      const created = block({ id: `cc000000-0000-4000-8000-00000000000${++seq}`, ...body })
      rows.unshift(created)
      return { status: 201, body: created }
    }
    const resolve = url.pathname.match(/^\/api\/blocks\/([^/]+)\/resolve$/)
    if (resolve && init.method === 'POST') {
      const index = rows.findIndex((b) => b.id === resolve[1])
      if (rows[index]?.status !== 'activo') return { status: 409, body: { statusCode: 409, message: 'resolved' } }
      const { resolutionNote } = JSON.parse(String(init.body)) as { resolutionNote: string }
      rows[index] = { ...rows[index]!, status: 'resuelto', resolutionNote, resolvedBy: REGISTRAR }
      return { status: 200, body: rows[index] }
    }
    return undefined
  }
  return { rows, handler }
}

function signIn(user: AuthUser, api: MockHandler) {
  sessionStore.set(TOKEN)
  return mockApi((url, init) => (url.pathname === '/api/auth/me' ? { status: 200, body: user } : api(url, init)))
}

const requests = (api: ReturnType<typeof mockApi>, method = 'GET') =>
  api.mock.calls
    .filter(([, init]) => (init?.method ?? 'GET') === method)
    .map(([input, init]) => ({ url: new URL(String(input)), body: init?.body ? JSON.parse(String(init.body)) : null }))
    .filter(({ url }) => url.pathname.startsWith('/api/blocks'))

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.clear()
})

describe('/bloqueos', () => {
  it('lists the active blocks by default, linked to each Expediente, read-only for Consulta', async () => {
    const { handler } = blocksServer([ACTIVE, RESOLVED])
    const api = signIn(userWith('consulta', 'ambas'), handler)
    renderApp('/bloqueos')

    expect(await screen.findByRole('heading', { name: 'Bloqueos', level: 1 })).toBeTruthy()
    const rows = await screen.findAllByRole('row')
    const body = rows.slice(1)
    expect(body).toHaveLength(1)
    expect(body[0]!.textContent).toContain('Impedimento médico ficticio')
    expect(body[0]!.textContent).toContain('Médico')
    expect(
      within(body[0]!)
        .getByRole('link', { name: /Persona De Prueba Uno/ })
        .getAttribute('href'),
    ).toBe(`/personal/${PERSON.id}`)
    expect(requests(api)[0]!.url.searchParams.get('status')).toBe('activo')
    expect(screen.getByRole('checkbox', { name: 'Activos' })).toHaveProperty('checked', true)
    expect(screen.queryByRole('button', { name: /Resolver/ })).toBeNull()
  })

  it('orders the columns ID, Persona, Tipo, Detalle, Fechas, Estado, Acciones', async () => {
    const { handler } = blocksServer([ACTIVE])
    signIn(userWith('consulta', 'ambas'), handler)
    renderApp('/bloqueos')

    await screen.findByText('Impedimento médico ficticio')
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent)
    expect(headers).toEqual(['Referencia', 'Persona', 'Tipo', 'Motivo', 'Registro', 'Estado', 'Acciones'])
    const cells = within(screen.getAllByRole('row')[1]!).getAllByRole('cell')
    expect(cells[0]!.textContent).toBe('BLQ-AA000000')
    expect(cells[5]!.textContent).toContain('Activo')
  })

  it('pages the list on the server with the range line and a rows-per-page choice', async () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      block({ id: `dd000000-0000-4000-8000-0000000000${String(i).padStart(2, '0')}`, reason: `Motivo ficticio ${i}` }),
    )
    const { handler } = blocksServer(many)
    const api = signIn(userWith('consulta', 'ambas'), handler)
    const user = userEvent.setup()
    renderApp('/bloqueos')

    await screen.findByText('Motivo ficticio 0')
    const nav = screen.getByRole('navigation', { name: 'Paginación' })
    expect(nav.textContent).toContain('Mostrando 1–25 de 30')
    await user.click(within(nav).getByRole('button', { name: 'Página 2' }))
    expect(await screen.findByText('Motivo ficticio 29')).toBeTruthy()
    expect(requests(api).at(-1)!.url.searchParams.get('page')).toBe('2')

    await user.selectOptions(
      within(screen.getByRole('navigation', { name: 'Paginación' })).getByLabelText('Filas por página'),
      '50',
    )
    await waitFor(() => {
      const last = requests(api).at(-1)!.url.searchParams
      expect([last.get('page'), last.get('pageSize')]).toEqual(['1', '50'])
    })
    expect(await screen.findByText('Motivo ficticio 0')).toBeTruthy()
    expect(screen.getByText('Motivo ficticio 29')).toBeTruthy()
  })

  it('filters by status, type and person on the server', async () => {
    const { handler } = blocksServer([ACTIVE, RESOLVED])
    const api = signIn(userWith('supervisor', 'medicina'), handler)
    const user = userEvent.setup()
    renderApp('/bloqueos')

    await screen.findByText('Impedimento médico ficticio')
    await user.click(screen.getByRole('checkbox', { name: 'Activos' }))
    await user.click(screen.getByRole('checkbox', { name: 'Resueltos' }))
    expect(await screen.findByText('Documento vencido ficticio')).toBeTruthy()
    expect(screen.getByText(/Documento consignado/)).toBeTruthy()
    expect(screen.queryByText('Impedimento médico ficticio')).toBeNull()

    await user.click(screen.getByRole('checkbox', { name: 'Médico' }))
    expect(await screen.findByText('Ningún bloqueo coincide con los filtros')).toBeTruthy()

    // Several values of one group reach the API as one comma-joined parameter.
    await user.click(screen.getByRole('checkbox', { name: 'Activos' }))
    await user.click(screen.getByRole('checkbox', { name: 'Administrativo' }))
    expect(await screen.findByText('Impedimento médico ficticio')).toBeTruthy()
    expect(screen.getByText('Documento vencido ficticio')).toBeTruthy()
    let last = requests(api).at(-1)!.url.searchParams
    expect([last.get('status'), last.get('type')]).toEqual(['activo,resuelto', 'administrativo,medico'])

    await user.click(screen.getByRole('button', { name: 'Limpiar Estado' }))
    await user.type(screen.getByLabelText('Persona'), '10000101')
    await waitFor(() => {
      last = requests(api).at(-1)!.url.searchParams
      expect([last.get('status'), last.get('type'), last.get('q'), last.get('page')]).toEqual([
        null,
        'administrativo,medico',
        '10000101',
        '1',
      ])
    })
  })

  it('resolves a block with a mandatory note (BR-08) and refreshes the list', async () => {
    const { handler } = blocksServer([ACTIVE])
    const api = signIn(userWith('supervisor', 'licencias'), handler)
    const user = userEvent.setup()
    renderApp('/bloqueos')

    await user.click(await screen.findByRole('button', { name: 'Resolver bloqueo' }))
    const dialog = screen.getByRole('dialog', { name: 'Resolver bloqueo' })
    await user.click(within(dialog).getByRole('button', { name: 'Resolver' }))
    expect(within(dialog).getByText('Escriba cómo se solventó el impedimento.')).toBeTruthy()
    expect(requests(api, 'POST')).toHaveLength(0)

    await user.type(within(dialog).getByLabelText(/Nota de resolución/), 'Impedimento solventado')
    await user.click(within(dialog).getByRole('button', { name: 'Resolver' }))

    expect(await screen.findByText('No hay bloqueos activos')).toBeTruthy()
    expect(requests(api, 'POST')).toEqual([
      {
        url: expect.objectContaining({ pathname: `/api/blocks/${ACTIVE.id}/resolve` }),
        body: { resolutionNote: 'Impedimento solventado' },
      },
    ])
    expect(await screen.findByText('Bloqueo resuelto.')).toBeTruthy()
  })

  it('shows the error state with a retry', async () => {
    let fail = true
    const { handler } = blocksServer([ACTIVE])
    signIn(userWith('administrador', 'ambas'), (url, init) =>
      fail && url.pathname === '/api/blocks' ? { status: 503, body: { message: 'x' } } : handler(url, init),
    )
    const user = userEvent.setup()
    renderApp('/bloqueos')

    expect(await screen.findByText('No se pudieron cargar los bloqueos')).toBeTruthy()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Impedimento médico ficticio')).toBeTruthy()
  })
})

describe('Expediente — bloqueos', () => {
  it('shows a persistent banner on every page key while a block is active, for every role', async () => {
    const { handler } = blocksServer([ACTIVE])
    signIn(userWith('consulta', 'licencias'), handler)
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}`)

    const banner = await screen.findByRole('alert')
    expect(banner.textContent).toContain('Bloqueada')
    expect(banner.textContent).toContain('Impedimento médico ficticio')
    await user.click(screen.getByRole('tab', { name: 'Médico' }))
    expect(screen.getByRole('alert').textContent).toContain('Bloqueada')
    expect(screen.queryByRole('button', { name: /Registrar bloqueo/ })).toBeNull()
  })

  it('shows no banner without an active block', async () => {
    const { handler } = blocksServer([RESOLVED])
    const api = signIn(userWith('consulta', 'licencias'), handler)
    renderApp(`/personal/${PERSON.id}`)

    await screen.findByRole('heading', { name: '10000101', level: 1 })
    await waitFor(() => expect(requests(api).length).toBeGreaterThan(0))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('registers a block from the header action and raises the banner (D2)', async () => {
    const { handler } = blocksServer([])
    const api = signIn(userWith('supervisor', 'medicina'), handler)
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}`)

    await user.click(await screen.findByRole('button', { name: 'Registrar bloqueo' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar bloqueo' })
    await user.click(within(dialog).getByRole('button', { name: 'Registrar' }))
    expect(within(dialog).getByText('Escriba el motivo del bloqueo.')).toBeTruthy()

    await user.selectOptions(within(dialog).getByLabelText(/Tipo/), 'regulatorio')
    await user.type(within(dialog).getByLabelText(/Motivo/), 'Sanción regulatoria ficticia')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Sanción regulatoria ficticia')
    expect(requests(api, 'POST')[0]!.body).toEqual({
      personalId: PERSON.id,
      type: 'regulatorio',
      reason: 'Sanción regulatoria ficticia',
    })
  })

  it('lists the person blocks on the Bloqueos page key and resolves one there', async () => {
    const { handler } = blocksServer([ACTIVE, RESOLVED])
    const api = signIn(userWith('administrador', 'licencias'), handler)
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}?pagina=bloqueos`)

    const panel = await screen.findByRole('tabpanel')
    expect(await within(panel).findByText(/Impedimento médico ficticio/)).toBeTruthy()
    expect(within(panel).queryByText(/Documento vencido ficticio/)).toBeNull()
    await user.click(within(panel).getByRole('button', { name: 'Todos' }))
    expect(within(panel).getByText(/Documento vencido ficticio/)).toBeTruthy()
    expect(requests(api).every((r) => r.url.searchParams.get('personalId') === PERSON.id)).toBe(true)

    await user.click(within(panel).getByRole('button', { name: 'Resolver bloqueo' }))
    const dialog = screen.getByRole('dialog', { name: 'Resolver bloqueo' })
    await user.type(within(dialog).getByLabelText(/Nota de resolución/), 'Alta médica ficticia')
    await user.click(within(dialog).getByRole('button', { name: 'Resolver' }))

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(within(screen.getByRole('tabpanel')).getByText(/Alta médica ficticia/)).toBeTruthy()
  })

  it('pages a long block history on the client', async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      block({
        id: `ee000000-0000-4000-8000-0000000000${String(i).padStart(2, '0')}`,
        reason: `Historial ficticio ${i}`,
        status: 'resuelto',
        resolvedBy: REGISTRAR,
        resolvedAt: '2026-10-06T09:00:00.000Z',
        resolutionNote: 'Nota ficticia',
      }),
    )
    const { handler } = blocksServer(many)
    signIn(userWith('consulta', 'licencias'), handler)
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}?pagina=bloqueos`)

    const panel = await screen.findByRole('tabpanel')
    await user.click(await within(panel).findByRole('button', { name: 'Resueltos' }))
    expect(within(panel).getByText(/Historial ficticio 9/)).toBeTruthy()
    expect(within(panel).queryByText(/Historial ficticio 10/)).toBeNull()
    const nav = within(panel).getByRole('navigation', { name: 'Paginación' })
    expect(nav.textContent).toContain('Mostrando 1–10 de 12')
    await user.click(within(nav).getByRole('button', { name: 'Página 2' }))
    expect(within(panel).getByText(/Historial ficticio 11/)).toBeTruthy()
    expect(within(panel).queryByText(/Historial ficticio 0/)).toBeNull()
  })
})
