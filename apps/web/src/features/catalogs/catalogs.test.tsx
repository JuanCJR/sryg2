// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AuthUser, CatalogItemDto, LicenseTypeItemDto } from '@sryg/types'
import { sessionStore } from '../../shared/session/session'
import { chooseRowAction } from '../../test/row-actions'
import { mockApi, type MockHandler } from '../../test/api-mock'
import { TOKEN, renderApp, userWith } from '../../test/render-app'

const STAMP = '2026-10-01T12:00:00.000Z'
const VEN: CatalogItemDto = {
  id: '7a1c2b3d-4e5f-4a6b-8c7d-9e0f1a2b3c01',
  nameEs: 'Venezolana',
  nameEn: 'Venezuelan',
  active: true,
  createdAt: STAMP,
  updatedAt: STAMP,
}
const OLD: CatalogItemDto = {
  ...VEN,
  id: '7a1c2b3d-4e5f-4a6b-8c7d-9e0f1a2b3c02',
  nameEs: 'Antigua',
  nameEn: null,
  active: false,
}
const PILOT: LicenseTypeItemDto = {
  ...VEN,
  id: '7a1c2b3d-4e5f-4a6b-8c7d-9e0f1a2b3c03',
  nameEs: 'Piloto Comercial - Avión',
  nameEn: 'Commercial Pilot - Airplane',
  rav60Category: 'piloto_comercial',
  requiredMedicalClass: 'clase_1',
  appliesExpiry: true,
  validityMonths: 12,
  validityIsPlaceholder: true,
}

const page = (items: object[], total = items.length, pageNumber = 1) => ({
  status: 200,
  body: { items, page: pageNumber, pageSize: 20, total },
})

function signIn(user: AuthUser, api: MockHandler) {
  sessionStore.set(TOKEN)
  return mockApi((url, init) => (url.pathname === '/api/auth/me' ? { status: 200, body: user } : api(url, init)))
}

const ADMIN = userWith('administrador', 'ambas')
const requests = (api: ReturnType<typeof mockApi>, method: string) =>
  api.mock.calls
    .filter(([, init]) => (init?.method ?? 'GET') === method)
    .map(([url, init]) => ({ url: new URL(String(url)), body: init?.body ? JSON.parse(String(init.body)) : undefined }))

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.clear()
})

describe('/catalogos (D19)', () => {
  it('lists the ten catalogs, each linking to its page', async () => {
    signIn(ADMIN, () => undefined)
    renderApp('/catalogos')

    const index = await screen.findByRole('list', { name: 'Catálogos' })
    const links = within(index).getAllByRole('link')
    expect(links).toHaveLength(10)
    expect(
      within(index)
        .getByRole('link', { name: /Tipos de licencia/ })
        .getAttribute('href'),
    ).toBe('/catalogos/license-types')
    expect(
      within(index)
        .getByRole('link', { name: /Nacionalidades/ })
        .getAttribute('href'),
    ).toBe('/catalogos/nationalities')
  })
})

describe('/catalogos/:catalogo (D19)', () => {
  it('answers 404 for an unknown catalog', async () => {
    signIn(ADMIN, () => undefined)
    renderApp('/catalogos/usuarios')
    expect(await screen.findByText('404')).toBeTruthy()
  })

  it('shows every item with both names and its state, and searches on the server', async () => {
    const api = signIn(userWith('consulta', 'licencias'), (url) =>
      url.pathname === '/api/catalogs/nationalities'
        ? url.searchParams.get('q') === 'ven'
          ? page([VEN])
          : page([OLD, VEN])
        : undefined,
    )
    const user = userEvent.setup()
    renderApp('/catalogos/nationalities')

    expect(await screen.findByRole('heading', { name: 'Nacionalidades' })).toBeTruthy()
    const rows = await screen.findAllByRole('row')
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Español'),
      expect.stringContaining('Inactivo'),
      expect.stringContaining('Venezuelan'),
    ])
    // Consulta only reads.
    expect(screen.queryByRole('button', { name: 'Nuevo ítem' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Acciones de/ })).toBeNull()

    await user.type(screen.getByLabelText('Buscar en el catálogo'), 'ven')
    await waitFor(() => expect(screen.queryByText('Antigua')).toBeNull())
    const searched = requests(api, 'GET').find(({ url }) => url.searchParams.get('q') === 'ven')
    expect(searched?.url.pathname).toBe('/api/catalogs/nationalities')
  })

  it('pages on the server with the range line and a rows-per-page choice', async () => {
    const api = signIn(ADMIN, (url) =>
      url.pathname === '/api/catalogs/nationalities'
        ? {
            status: 200,
            body: {
              items: [VEN],
              page: Number(url.searchParams.get('page')),
              pageSize: Number(url.searchParams.get('pageSize')),
              total: 30,
            },
          }
        : undefined,
    )
    const user = userEvent.setup()
    renderApp('/catalogos/nationalities')

    const pagination = await screen.findByRole('navigation', { name: 'Paginación' })
    expect(pagination.textContent).toContain('Mostrando 1–25 de 30')
    await user.click(within(pagination).getByRole('button', { name: 'Página siguiente' }))
    await waitFor(() =>
      expect(screen.getByRole('navigation', { name: 'Paginación' }).textContent).toContain('Mostrando 26–30 de 30'),
    )
    await user.selectOptions(screen.getByLabelText('Filas por página'), '10')
    await waitFor(() =>
      expect(screen.getByRole('navigation', { name: 'Paginación' }).textContent).toContain('Mostrando 1–10 de 30'),
    )
    const last = requests(api, 'GET')
      .filter(({ url }) => url.pathname === '/api/catalogs/nationalities')
      .at(-1)
    expect([last?.url.searchParams.get('page'), last?.url.searchParams.get('pageSize')]).toEqual(['1', '10'])
  })

  it('shows the empty state of a catalog with no items', async () => {
    signIn(ADMIN, () => page([]))
    renderApp('/catalogos/aircraft')
    expect(await screen.findByText('Este catálogo aún no tiene ítems')).toBeTruthy()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    signIn(ADMIN, () => (fail ? { status: 503, body: { message: 'x' } } : page([VEN])))
    const user = userEvent.setup()
    renderApp('/catalogos/nationalities')

    expect(await screen.findByText('No se pudo cargar el catálogo')).toBeTruthy()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Venezolana')).toBeTruthy()
  })

  it('lets the Admin create an item in Spanish and English', async () => {
    let items: object[] = []
    const api = signIn(ADMIN, (url, init) => {
      if (url.pathname !== '/api/catalogs/nationalities') return undefined
      if (init.method === 'POST') {
        items = [VEN]
        return { status: 201, body: VEN }
      }
      return page(items)
    })
    const user = userEvent.setup()
    renderApp('/catalogos/nationalities')

    await user.click(await screen.findByRole('button', { name: 'Nuevo ítem' }))
    const dialog = screen.getByRole('dialog', { name: 'Nuevo ítem' })
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(within(dialog).getByText('Escriba el nombre en español.')).toBeTruthy()
    expect(requests(api, 'POST')).toHaveLength(0)

    await user.type(within(dialog).getByLabelText(/Nombre en español/), 'Venezolana')
    await user.type(within(dialog).getByLabelText(/Nombre en inglés/), 'Venezuelan')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nuevo ítem' })).toBeNull())
    expect(requests(api, 'POST')[0]?.body).toEqual({ nameEs: 'Venezolana', nameEn: 'Venezuelan' })
    expect(await screen.findByText('Venezolana')).toBeTruthy()
    expect(screen.getByText('Ítem creado.')).toBeTruthy()
  })

  it('keeps the dialog open with a readable message on a duplicate name (409)', async () => {
    signIn(ADMIN, (_url, init) =>
      init.method === 'POST'
        ? { status: 409, body: { statusCode: 409, error: 'Conflict', message: 'x' } }
        : page([VEN]),
    )
    const user = userEvent.setup()
    renderApp('/catalogos/nationalities')

    await user.click(await screen.findByRole('button', { name: 'Nuevo ítem' }))
    const dialog = screen.getByRole('dialog', { name: 'Nuevo ítem' })
    await user.type(within(dialog).getByLabelText(/Nombre en español/), 'venezolana')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(await within(dialog).findByText('Ya existe un ítem con ese nombre en español.')).toBeTruthy()
  })

  it('edits an item and sends only what changed', async () => {
    const api = signIn(ADMIN, (_url, init) =>
      init.method === 'PATCH' ? { status: 200, body: { ...VEN, nameEn: 'Venezuelan (VE)' } } : page([VEN]),
    )
    const user = userEvent.setup()
    renderApp('/catalogos/nationalities')

    await chooseRowAction(user, await screen.findByRole('button', { name: 'Acciones de Venezolana' }), 'Editar')
    const dialog = screen.getByRole('dialog', { name: 'Editar ítem' })
    const nameEn = within(dialog).getByLabelText(/Nombre en inglés/) as HTMLInputElement
    expect(nameEn.value).toBe('Venezuelan')
    await user.clear(nameEn)
    await user.type(nameEn, 'Venezuelan (VE)')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar ítem' })).toBeNull())
    const [patch] = requests(api, 'PATCH')
    expect(patch?.url.pathname).toBe(`/api/catalogs/nationalities/${VEN.id}`)
    expect(patch?.body).toEqual({ nameEn: 'Venezuelan (VE)' })
  })

  it('deactivates and reactivates items', async () => {
    const api = signIn(ADMIN, (_url, init) => (init.method === 'PATCH' ? { status: 200, body: VEN } : page([OLD, VEN])))
    const user = userEvent.setup()
    renderApp('/catalogos/nationalities')

    await chooseRowAction(user, await screen.findByRole('button', { name: 'Acciones de Venezolana' }), 'Desactivar')
    await chooseRowAction(user, await screen.findByRole('button', { name: 'Acciones de Antigua' }), 'Activar')

    await waitFor(() => expect(requests(api, 'PATCH')).toHaveLength(2))
    expect(requests(api, 'PATCH').map(({ url, body }) => [url.pathname.split('/').pop(), body])).toEqual([
      [VEN.id, { active: false }],
      [OLD.id, { active: true }],
    ])
  })

  it('deletes an unused item after confirming, and explains that an item in use must be deactivated', async () => {
    let inUse = false
    const api = signIn(ADMIN, (_url, init) =>
      init.method === 'DELETE'
        ? inUse
          ? { status: 409, body: { statusCode: 409, error: 'Conflict', message: 'x' } }
          : { status: 204 }
        : page([VEN]),
    )
    const user = userEvent.setup()
    renderApp('/catalogos/nationalities')

    await chooseRowAction(user, await screen.findByRole('button', { name: 'Acciones de Venezolana' }), 'Eliminar')
    const confirm = screen.getByRole('dialog', { name: 'Eliminar ítem' })
    await user.click(within(confirm).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(requests(api, 'DELETE')).toHaveLength(1))
    expect(requests(api, 'DELETE')[0]?.url.pathname).toBe(`/api/catalogs/nationalities/${VEN.id}`)
    expect(await screen.findByText('Ítem eliminado.')).toBeTruthy()

    inUse = true
    await chooseRowAction(user, await screen.findByRole('button', { name: 'Acciones de Venezolana' }), 'Eliminar')
    await user.click(
      within(screen.getByRole('dialog', { name: 'Eliminar ítem' })).getByRole('button', { name: 'Eliminar' }),
    )
    expect(
      await screen.findByText('El ítem está en uso y no se puede eliminar. Desactívelo para que deje de ofrecerse.'),
    ).toBeTruthy()
  })

  it('shows and edits the license-type fields, marking a placeholder validity PENDIENTE INAC (D3)', async () => {
    const api = signIn(ADMIN, (url, init) =>
      url.pathname.startsWith('/api/catalogs/license-types')
        ? init.method === 'PATCH'
          ? { status: 200, body: { ...PILOT, validityMonths: 24, validityIsPlaceholder: false } }
          : page([PILOT])
        : undefined,
    )
    const user = userEvent.setup()
    renderApp('/catalogos/license-types')

    const row = (await screen.findAllByRole('row'))[1]!
    expect(row.textContent).toContain('Piloto comercial')
    expect(row.textContent).toContain('Clase 1')
    expect(row.textContent).toContain('12 meses')
    expect(row.textContent).toContain('PENDIENTE INAC')

    await chooseRowAction(user, within(row).getByRole('button', { name: /^Acciones de/ }), 'Editar')
    const dialog = screen.getByRole('dialog', { name: 'Editar ítem' })
    expect((within(dialog).getByLabelText(/Categoría RAV 60/) as HTMLSelectElement).value).toBe('piloto_comercial')
    expect((within(dialog).getByLabelText('Clase médica exigida') as HTMLSelectElement).value).toBe('clase_1')
    expect((within(dialog).getByLabelText('Aplica vencimiento') as HTMLInputElement).checked).toBe(true)
    const months = within(dialog).getByLabelText(/Vigencia/) as HTMLInputElement
    expect(within(dialog).getByText(/PENDIENTE INAC/)).toBeTruthy()
    await user.clear(months)
    await user.type(months, '24')
    await user.selectOptions(within(dialog).getByLabelText('Clase médica exigida'), '')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(requests(api, 'PATCH')).toHaveLength(1))
    expect(requests(api, 'PATCH')[0]?.body).toEqual({ requiredMedicalClass: null, validityMonths: 24 })
  })

  it('saves a placeholder validity as is when the Admin confirms it', async () => {
    const api = signIn(ADMIN, (_url, init) =>
      init.method === 'PATCH' ? { status: 200, body: { ...PILOT, validityIsPlaceholder: false } } : page([PILOT]),
    )
    const user = userEvent.setup()
    renderApp('/catalogos/license-types')

    await chooseRowAction(user, await screen.findByRole('button', { name: /^Acciones de/ }), 'Editar')
    await user.click(
      within(screen.getByRole('dialog', { name: 'Editar ítem' })).getByRole('button', { name: 'Guardar' }),
    )

    await waitFor(() => expect(requests(api, 'PATCH')).toHaveLength(1))
    expect(requests(api, 'PATCH')[0]?.body).toEqual({ validityMonths: 12 })
  })
})
