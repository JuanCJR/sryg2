// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AuditEntryDto, AuthUser, PersonnelDto } from '@sryg/types'
import { sessionStore } from '../../shared/session/session'
import { authorizationOf, mockApi, type MockHandler } from '../../test/api-mock'
import { TOKEN, renderApp, userWith } from '../../test/render-app'

const PERSON_ID = '0b6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e11'
const ENTITY_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'

const PERSON: PersonnelDto = {
  id: PERSON_ID,
  cedula: 'V-00.000.101',
  firstNames: 'Persona',
  lastNames: 'De Prueba Uno',
  documentTypeId: null,
  nationalityId: null,
  birthDate: null,
  address: null,
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
  updatedAt: '2026-10-02T13:05:00.000Z',
}

const ENTRIES: AuditEntryDto[] = [
  {
    id: 2,
    occurredAt: '2026-10-02T14:05:00.000Z',
    actor: { id: '3f2b6a1c-8d4e-4f5a-9b6c-7d8e9f0a1b2c', fullName: 'Supervisora De Prueba', email: 'sup@sryg.test' },
    action: 'actualizar',
    entity: 'personal_aeronautico',
    entityId: PERSON_ID,
    changes: { before: { cargo: null, address: 'A' }, after: { cargo: 'Piloto', address: 'B' } },
  },
  {
    id: 1,
    occurredAt: '2026-10-01T08:00:00.000Z',
    actor: null,
    action: 'autenticar',
    entity: 'usuario',
    entityId: null,
    changes: null,
  },
]

const page = (items: AuditEntryDto[], total = items.length, pageNumber = 1) => ({
  status: 200,
  body: { items, page: pageNumber, pageSize: 50, total },
})

function signIn(user: AuthUser, api: MockHandler) {
  sessionStore.set(TOKEN)
  return mockApi((url, init) => (url.pathname === '/api/auth/me' ? { status: 200, body: user } : api(url, init)))
}

const auditCalls = (api: ReturnType<typeof mockApi>, path = '/api/audit') =>
  api.mock.calls.map(([url]) => new URL(String(url))).filter((url) => url.pathname === path)
const lastAuditCall = (api: ReturnType<typeof mockApi>) => auditCalls(api).at(-1)!

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  sessionStore.clear()
})

describe('/auditoria (REP-04)', () => {
  it('is closed to Consulta (D1)', async () => {
    signIn(userWith('consulta', 'ambas'), () => page(ENTRIES))
    renderApp('/auditoria')
    expect(await screen.findByRole('heading', { name: 'Acceso restringido' })).toBeTruthy()
  })

  it('lists the trail newest first with date, actor, action, entity and changed fields', async () => {
    const api = signIn(userWith('supervisor', 'medicina'), (url) =>
      url.pathname === '/api/audit' ? page(ENTRIES) : undefined,
    )
    renderApp('/auditoria')

    expect(await screen.findByRole('heading', { name: 'Auditoría', level: 1 })).toBeTruthy()
    const table = await screen.findByRole('table', { name: 'Registro de auditoría' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(
      rows.map((row) =>
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent),
      ),
    ).toEqual([
      ['02 oct 2026 · 14:05', 'Supervisora De Prueba', 'Actualizar', 'Personal', 'cargo, address'],
      ['01 oct 2026 · 08:00', 'Sistema', 'Autenticar', 'Usuario', '—'],
    ])
    expect(screen.getByText('2 registros')).toBeTruthy()
    const call = lastAuditCall(api)
    expect(call.searchParams.get('page')).toBe('1')
    expect(authorizationOf(api.mock.calls.at(-1)![1])).toBe(`Bearer ${TOKEN}`)
  })

  it('shows the empty state and the error state with a retry', async () => {
    let reply: { status: number; body?: unknown } = { status: 503, body: { message: 'x' } }
    signIn(userWith('administrador', 'ambas'), (url) => (url.pathname === '/api/audit' ? reply : undefined))
    const user = userEvent.setup()
    renderApp('/auditoria')

    expect(await screen.findByText('No se pudo cargar la auditoría')).toBeTruthy()
    reply = page([])
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Sin registros para estos filtros')).toBeTruthy()
  })

  it('filters on the server by actor, action, entity, entity id and date range', async () => {
    const api = signIn(userWith('administrador', 'ambas'), (url) =>
      url.pathname === '/api/audit' ? page(ENTRIES) : undefined,
    )
    const user = userEvent.setup()
    renderApp('/auditoria')
    await screen.findByRole('table', { name: 'Registro de auditoría' })

    await user.selectOptions(screen.getByLabelText('Acción'), 'actualizar')
    await user.selectOptions(screen.getByLabelText('Entidad'), 'licencia')
    await user.type(screen.getByLabelText('Actor'), 'supervisora')
    await user.type(screen.getByLabelText('ID de entidad'), ENTITY_ID)
    await user.type(screen.getByLabelText('Desde'), '01102026')
    await user.type(screen.getByLabelText('Hasta'), '14102026')

    await waitFor(() =>
      expect(Object.fromEntries(lastAuditCall(api).searchParams)).toEqual({
        page: '1',
        pageSize: '50',
        action: 'actualizar',
        entity: 'licencia',
        actor: 'supervisora',
        entityId: ENTITY_ID,
        from: '2026-10-01',
        to: '2026-10-14',
      }),
    )
  })

  it('does not query with an incomplete entity id or an inverted range, and says why', async () => {
    const api = signIn(userWith('administrador', 'ambas'), (url) =>
      url.pathname === '/api/audit' ? page(ENTRIES) : undefined,
    )
    const user = userEvent.setup()
    renderApp('/auditoria')
    await screen.findByRole('table', { name: 'Registro de auditoría' })
    const before = auditCalls(api).length

    await user.type(screen.getByLabelText('ID de entidad'), '7c9e')
    expect(await screen.findByText('Escriba el identificador completo (UUID).')).toBeTruthy()
    await user.clear(screen.getByLabelText('ID de entidad'))
    await user.type(screen.getByLabelText('Desde'), '14102026')
    await user.type(screen.getByLabelText('Hasta'), '01102026')
    expect(await screen.findByText('La fecha inicial no puede ser posterior a la final.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Exportar CSV' }).hasAttribute('disabled')).toBe(true)
    expect(auditCalls(api).every((url) => !url.searchParams.has('entityId') && !url.searchParams.has('to'))).toBe(true)
    expect(auditCalls(api).length).toBeGreaterThanOrEqual(before)
  })

  it('paginates on the server', async () => {
    const api = signIn(userWith('administrador', 'ambas'), (url) =>
      url.pathname === '/api/audit' ? page(ENTRIES, 120, Number(url.searchParams.get('page'))) : undefined,
    )
    const user = userEvent.setup()
    renderApp('/auditoria')
    await screen.findByRole('table', { name: 'Registro de auditoría' })

    expect(screen.getByText('120 registros')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await waitFor(() => expect(lastAuditCall(api).searchParams.get('page')).toBe('2'))
    await waitFor(() =>
      expect(screen.getByRole('navigation', { name: 'Paginación' }).textContent).toContain('Página 2 de 3'),
    )
  })

  it('exports the current filters as CSV with the session token (REP-05)', async () => {
    const createObjectURL = vi.fn(() => 'blob:auditoria')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const api = signIn(userWith('supervisor', 'licencias'), (url) => {
      if (url.pathname === '/api/audit') return page(ENTRIES)
      if (url.pathname === '/api/audit/export.csv') return { status: 200, body: 'fecha,actor' }
      return undefined
    })
    const user = userEvent.setup()
    renderApp('/auditoria')
    await screen.findByRole('table', { name: 'Registro de auditoría' })

    await user.selectOptions(screen.getByLabelText('Acción'), 'crear')
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }))

    await waitFor(() => expect(click).toHaveBeenCalledOnce())
    const exportCall = api.mock.calls.find(([url]) => new URL(String(url)).pathname === '/api/audit/export.csv')!
    expect(Object.fromEntries(new URL(String(exportCall[0])).searchParams)).toEqual({ action: 'crear' })
    expect(authorizationOf(exportCall[1])).toBe(`Bearer ${TOKEN}`)
    expect(createObjectURL).toHaveBeenCalledOnce()
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:auditoria'))
  })

  it('reports a failed export', async () => {
    signIn(userWith('supervisor', 'licencias'), (url) => {
      if (url.pathname === '/api/audit') return page(ENTRIES)
      if (url.pathname === '/api/audit/export.csv') return { status: 500, body: { message: 'x' } }
      return undefined
    })
    const user = userEvent.setup()
    renderApp('/auditoria')
    await screen.findByRole('table', { name: 'Registro de auditoría' })

    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }))
    expect(await screen.findByText('No se pudo exportar la auditoría. Intente de nuevo.')).toBeTruthy()
  })
})

describe('Expediente > Historial', () => {
  it("shows the person's trail, filtered on the server by person", async () => {
    const api = signIn(userWith('supervisor', 'licencias'), (url) => {
      if (url.pathname === `/api/personnel/${PERSON_ID}`) return { status: 200, body: PERSON }
      if (url.pathname === '/api/audit') return page(ENTRIES.slice(0, 1))
      return undefined
    })
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON_ID}?pagina=historial`)

    const panel = await screen.findByRole('tabpanel')
    const table = await within(panel).findByRole('table', { name: 'Historial de la persona' })
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    expect(within(table).getByText('Supervisora De Prueba')).toBeTruthy()
    expect(lastAuditCall(api).searchParams.get('personId')).toBe(PERSON_ID)

    await user.selectOptions(within(panel).getByLabelText('Acción'), 'emitir')
    await waitFor(() => expect(lastAuditCall(api).searchParams.get('action')).toBe('emitir'))
    expect(lastAuditCall(api).searchParams.get('personId')).toBe(PERSON_ID)
  })

  it('shows its own empty and error states', async () => {
    let reply: { status: number; body?: unknown } = { status: 500, body: { message: 'x' } }
    signIn(userWith('administrador', 'ambas'), (url) => {
      if (url.pathname === `/api/personnel/${PERSON_ID}`) return { status: 200, body: PERSON }
      if (url.pathname === '/api/audit') return reply
      return undefined
    })
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON_ID}?pagina=historial`)

    expect(await screen.findByText('No se pudo cargar el historial')).toBeTruthy()
    reply = page([])
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Sin registros para estos filtros')).toBeTruthy()
  })
})
