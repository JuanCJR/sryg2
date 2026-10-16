// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type {
  AuthUser,
  CatalogOption,
  LicenseCheckDto,
  LicenseDto,
  LicenseHistoryEntryDto,
  LicenseListItemDto,
  PersonnelDto,
} from '@sryg/types'
import { sessionStore } from '../../common/services/session'
import { mockApi, type MockHandler } from '../../test/api-mock'
import { currentLocation, TOKEN, renderApp, userWith } from '../../test/render-app'

// Fictitious data only.
const PERSON: PersonnelDto = {
  id: '0b6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e11',
  cedula: '10000101',
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
  category: 'piloto_comercial',
  status: 'activo',
  hasPhoto: false,
  hasSignature: false,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-02T13:05:00.000Z',
}

const TYPE: CatalogOption = {
  id: '5a000000-0000-4000-8000-000000000001',
  nameEs: 'Piloto Comercial - Avión',
  nameEn: 'Commercial Pilot - Airplane',
}
const B737: CatalogOption = { id: '5a000000-0000-4000-8000-000000000002', nameEs: 'B737', nameEn: 'B737' }
const PIC: CatalogOption = { id: '5a000000-0000-4000-8000-000000000003', nameEs: 'Capitán', nameEn: 'PIC' }
const SEL: CatalogOption = {
  id: '5a000000-0000-4000-8000-000000000004',
  nameEs: 'Monomotores Terrestres',
  nameEn: 'Single Engine Land',
}
const C172: CatalogOption = { id: '5a000000-0000-4000-8000-000000000005', nameEs: 'C172', nameEn: null }
const OBS: CatalogOption = {
  id: '5a000000-0000-4000-8000-000000000006',
  nameEs: 'No válida para vuelos internacionales',
  nameEn: null,
}

const LICENSE: LicenseDto = {
  id: '6b000000-0000-4000-8000-000000000001',
  personalId: PERSON.id,
  licenseType: { ...TYPE, rav60Category: 'piloto_comercial', requiredMedicalClass: 'clase_1', appliesExpiry: true },
  number: '10000101',
  issueDate: '2025-01-31',
  expiryDate: '2027-01-31',
  status: 'vigente',
  observations: [OBS],
  typeRatings: [
    {
      id: '6b000000-0000-4000-8000-000000000002',
      licenseId: '6b000000-0000-4000-8000-000000000001',
      typeRating: B737,
      function: PIC,
      expiryDate: '2026-11-01',
      status: 'proxima_a_vencer',
    },
  ],
  classRatings: [
    {
      id: '6b000000-0000-4000-8000-000000000003',
      licenseId: '6b000000-0000-4000-8000-000000000001',
      classRating: SEL,
      aircraft: [C172],
      expiryDate: '2026-01-01',
      status: 'vencida',
    },
  ],
  createdAt: '2025-01-31T12:00:00.000Z',
  updatedAt: '2025-01-31T12:00:00.000Z',
}

const CLEAR: LicenseCheckDto = { blocked: false, problems: [], projection: null }

function signIn(user: AuthUser, api: MockHandler) {
  sessionStore.set(TOKEN)
  return mockApi((url, init) => (url.pathname === '/api/auth/me' ? { status: 200, body: user } : api(url, init)))
}

const json = (init: RequestInit) => JSON.parse(String(init.body)) as Record<string, unknown>
const catalogOptions: Record<string, CatalogOption[]> = {
  'license-types': [TYPE],
  'type-ratings': [B737],
  functions: [PIC],
  'class-ratings': [SEL],
  aircraft: [C172],
  'license-observations': [OBS],
}
const catalogs: MockHandler = (url) => {
  const match = /^\/api\/catalogs\/([^/]+)\/options$/.exec(url.pathname)
  return match ? { status: 200, body: catalogOptions[match[1]!] ?? [] } : undefined
}

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.clear()
})

describe('Consulta de licencias (/licencias)', () => {
  const ITEM: LicenseListItemDto = {
    id: LICENSE.id,
    personalId: PERSON.id,
    person: { cedula: PERSON.cedula, firstNames: PERSON.firstNames, lastNames: PERSON.lastNames },
    licenseType: { ...TYPE, rav60Category: 'piloto_comercial' },
    number: 'L-0001',
    issueDate: '2025-01-31',
    expiryDate: null,
    status: 'vigente',
  }
  const page = (items: LicenseListItemDto[], total = items.length) => ({
    status: 200,
    body: { items, page: 1, pageSize: 25, total },
  })

  it('lists the licenses and links each one to the Expediente', async () => {
    signIn(userWith('consulta', 'medicina'), (url) => (url.pathname === '/api/licenses' ? page([ITEM]) : undefined))
    renderApp('/licencias')

    const row = await screen.findByRole('link', { name: /Persona De Prueba Uno/ })
    expect(row.getAttribute('href')).toBe(`/personal/${PERSON.id}?pagina=licencias`)
    expect(row.textContent).toContain('Piloto Comercial - Avión')
    expect(row.textContent).toContain('L-0001')
    expect(row.textContent).toContain('Sin vencimiento')
    expect(row.textContent).toContain('Activa')
  })

  it('sends the SLYM filters to the server and says when nothing matches', async () => {
    const api = signIn(userWith('supervisor', 'licencias'), (url) => {
      if (url.pathname !== '/api/licenses') return catalogs(url, {})
      return url.searchParams.get('number') ? page([]) : page([ITEM])
    })
    const user = userEvent.setup()
    renderApp('/licencias')
    await screen.findByRole('link', { name: /Persona De Prueba Uno/ })

    await user.type(screen.getByLabelText('Solicitante'), 'prueba')
    await user.type(screen.getByLabelText('Número'), 'X-9')
    await user.type(screen.getByLabelText('Vence desde'), '01012026')
    await user.type(screen.getByLabelText('Vence hasta'), '31122026')
    await user.click(screen.getByRole('combobox', { name: 'Tipo de licencia' }))
    await user.click(await screen.findByRole('option', { name: /Piloto Comercial - Avión/ }))

    expect(await screen.findByText('Sin resultados para estos filtros')).toBeTruthy()
    const last = new URL(String(api.mock.calls.filter(([u]) => String(u).includes('/api/licenses?')).at(-1)![0]))
    expect(Object.fromEntries(last.searchParams)).toMatchObject({
      q: 'prueba',
      number: 'X-9',
      licenseTypeId: TYPE.id,
      expiryFrom: '2026-01-01',
      expiryTo: '2026-12-31',
      page: '1',
      pageSize: '25',
    })
  })

  it('orders the columns Número, Solicitante, Tipo, Emitida, Vence, Estado and keeps the filters in the left panel', async () => {
    signIn(userWith('consulta', 'medicina'), (url) => (url.pathname === '/api/licenses' ? page([ITEM]) : undefined))
    renderApp('/licencias')

    const row = await screen.findByRole('link', { name: /Persona De Prueba Uno/ })
    const text = row.textContent ?? ''
    const order = [
      'L-0001',
      'Persona De Prueba Uno',
      'Piloto Comercial - Avión',
      '31 ene 2025',
      'Sin vencimiento',
      'Activa',
    ]
    const positions = order.map((part) => text.indexOf(part))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    expect(screen.getByRole('complementary', { name: 'Filtros de licencias' })).toBeTruthy()
  })

  it('paginates on the server with the range line, a page size selector, and back to page 1 on a filter change', async () => {
    const api = signIn(userWith('consulta', 'ambas'), (url) =>
      url.pathname === '/api/licenses'
        ? {
            status: 200,
            body: {
              items: [ITEM],
              page: Number(url.searchParams.get('page')),
              pageSize: Number(url.searchParams.get('pageSize')),
              total: 60,
            },
          }
        : undefined,
    )
    const user = userEvent.setup()
    renderApp('/licencias')
    await screen.findByRole('link', { name: /Persona De Prueba Uno/ })
    const lastQuery = () =>
      Object.fromEntries(
        new URL(String(api.mock.calls.filter(([u]) => String(u).includes('/api/licenses?')).at(-1)![0])).searchParams,
      )

    const nav = screen.getByRole('navigation', { name: 'Paginación' })
    expect(nav.textContent).toMatch(/Mostrando\s*1–25\s*de\s*60/)
    await user.click(within(nav).getByRole('button', { name: 'Página 2' }))
    await waitFor(() => expect(lastQuery()).toMatchObject({ page: '2', pageSize: '25' }))

    await user.selectOptions(await screen.findByLabelText('Filas por página'), '50')
    await waitFor(() => expect(lastQuery()).toMatchObject({ page: '1', pageSize: '50' }))

    await user.click(await screen.findByRole('button', { name: 'Página 2' }))
    await waitFor(() => expect(lastQuery()).toMatchObject({ page: '2' }))
    await user.type(screen.getByLabelText('Número'), 'L')
    await waitFor(() => expect(lastQuery()).toMatchObject({ number: 'L', page: '1' }))
  })

  it('shows the empty registry and the error state with retry', async () => {
    let fail = true
    signIn(userWith('consulta', 'ambas'), () => (fail ? { status: 500, body: { message: 'x' } } : page([])))
    const user = userEvent.setup()
    renderApp('/licencias')

    expect(await screen.findByText('No se pudieron cargar las licencias')).toBeTruthy()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Aún no hay licencias emitidas')).toBeTruthy()
  })
})

describe('Licencias page key of the Expediente', () => {
  const HISTORY: LicenseHistoryEntryDto[] = [
    {
      id: 2,
      occurredAt: '2026-10-01T14:05:00.000Z',
      action: 'renovar',
      entity: 'licencia',
      entityId: LICENSE.id,
      actorName: 'Supervisora Ficticia',
    },
  ]
  const api: MockHandler = (url) => {
    if (url.pathname === `/api/personnel/${PERSON.id}`) return { status: 200, body: PERSON }
    if (url.pathname === `/api/personnel/${PERSON.id}/licenses`) return { status: 200, body: [LICENSE] }
    if (url.pathname === `/api/licenses/${LICENSE.id}/history`) return { status: 200, body: HISTORY }
    return undefined
  }

  it('shows each license with its observations and its type and class ratings', async () => {
    signIn(userWith('consulta', 'ambas'), api)
    renderApp(`/personal/${PERSON.id}?pagina=licencias`)

    const licenses = await screen.findByRole('table', { name: 'Licencias' })
    // The table repeats each cell in its phone layout, hence getAll.
    expect(within(licenses).getAllByText('Piloto Comercial - Avión').length).toBeGreaterThan(0)
    expect(within(licenses).getByText('31 ene 2027')).toBeTruthy()
    const typeRatings = screen.getByRole('table', { name: 'Habilitaciones de tipo' })
    expect(within(typeRatings).getAllByText('B737 · Capitán').length).toBeGreaterThan(0)
    expect(within(typeRatings).getAllByText('Próxima a vencer').length).toBeGreaterThan(0)
    const classRatings = screen.getByRole('table', { name: 'Habilitaciones de clase' })
    expect(within(classRatings).getAllByText('Monomotores Terrestres · C172').length).toBeGreaterThan(0)
    expect(within(classRatings).getAllByText('Vencida').length).toBeGreaterThan(0)
    expect(screen.getByText('No válida para vuelos internacionales')).toBeTruthy()
    // Consulta neither renews nor reads the audit trail (D1).
    expect(screen.queryByRole('link', { name: /Renovar/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Ver historial/ })).toBeNull()
  })

  it('offers the renewal and the history to a Supervisor de Licencias', async () => {
    signIn(userWith('supervisor', 'licencias'), api)
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}?pagina=licencias`)

    const renew = await screen.findByRole('link', { name: /Renovar Piloto Comercial - Avión/ })
    expect(renew.getAttribute('href')).toBe(`/personal/${PERSON.id}/licencia?licencia=${LICENSE.id}`)
    await user.click(screen.getByRole('button', { name: /Ver historial/ }))
    expect(await screen.findByText(/Renovación · Supervisora Ficticia/)).toBeTruthy()
  })

  it('puts Número first and Estado last in the expediente tables', async () => {
    signIn(userWith('consulta', 'ambas'), api)
    renderApp(`/personal/${PERSON.id}?pagina=licencias`)

    const licenses = await screen.findByRole('table', { name: 'Licencias' })
    expect(
      within(licenses)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Número', 'Nombre', 'Emitida', 'Vence', 'Restante', 'Estado'])
    const typeRatings = screen.getByRole('table', { name: 'Habilitaciones de tipo' })
    expect(
      within(typeRatings)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Nombre', 'Emitida', 'Vence', 'Restante', 'Estado'])
  })

  it('pages a long license history ten lines at a time', async () => {
    const long: LicenseHistoryEntryDto[] = Array.from({ length: 12 }, (_, index) => ({
      ...HISTORY[0]!,
      id: index + 1,
      actorName: `Operador ${index + 1}`,
    }))
    signIn(userWith('supervisor', 'licencias'), (url, init) =>
      url.pathname === `/api/licenses/${LICENSE.id}/history` ? { status: 200, body: long } : api(url, init),
    )
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}?pagina=licencias`)

    await user.click(await screen.findByRole('button', { name: /Ver historial/ }))
    expect(await screen.findByText(/Operador 10$/)).toBeTruthy()
    expect(screen.queryByText(/Operador 11$/)).toBeNull()
    const nav = screen.getByRole('navigation', { name: 'Paginación' })
    expect(nav.textContent).toMatch(/Mostrando\s*1–10\s*de\s*12/)
    await user.click(within(nav).getByRole('button', { name: 'Página 2' }))
    expect(await screen.findByText(/Operador 12$/)).toBeTruthy()
    expect(screen.queryByText(/Operador 1$/)).toBeNull()
  })

  it('says when the person holds no license, and the header action opens the trámite', async () => {
    signIn(userWith('administrador', 'ambas'), (url) =>
      url.pathname === `/api/personnel/${PERSON.id}/licenses` ? { status: 200, body: [] } : api(url, {}),
    )
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}?pagina=licencias`)

    expect(await screen.findByText('La persona no tiene licencias registradas.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Emitir o renovar' }))
    expect(currentLocation()).toBe(`/personal/${PERSON.id}/licencia`)
  })
})

describe('Emisión o renovación de licencia', () => {
  const formApi =
    (overrides: { licenses?: LicenseDto[]; check?: (url: URL) => LicenseCheckDto; submit?: MockHandler } = {}) =>
    (url: URL, init: RequestInit) => {
      if (url.pathname === `/api/personnel/${PERSON.id}`) return { status: 200, body: PERSON }
      if (url.pathname === `/api/personnel/${PERSON.id}/licenses`)
        return { status: 200, body: overrides.licenses ?? [] }
      if (url.pathname === '/api/licenses/check') return { status: 200, body: (overrides.check ?? (() => CLEAR))(url) }
      if (init.method === 'POST' && overrides.submit) return overrides.submit(url, init)
      return catalogs(url, init)
    }

  it('shows an open block as the page state on arrival, with no form (BR-07)', async () => {
    signIn(
      userWith('supervisor', 'licencias'),
      formApi({
        check: () => ({ blocked: true, problems: ['La persona tiene un bloqueo activo.'], projection: null }),
      }),
    )
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}/licencia`)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Emisión impedida')
    expect(alert.textContent).toContain('La persona tiene un bloqueo activo.')
    expect(screen.queryByRole('button', { name: /Emitir licencia/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Volver al expediente' }))
    expect(currentLocation()).toBe(`/personal/${PERSON.id}`)
  })

  it('issues a license with a type rating: projected expiry in the rail, number from the document (D22)', async () => {
    const api = signIn(
      userWith('supervisor', 'licencias'),
      formApi({
        check: (url) =>
          url.searchParams.get('licenseTypeId')
            ? {
                blocked: false,
                problems: [],
                projection: { expiryDate: '2028-10-14', appliesExpiry: true, validityIsPlaceholder: true },
              }
            : CLEAR,
        submit: (url) => (url.pathname === '/api/licenses' ? { status: 201, body: LICENSE } : undefined),
      }),
    )
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}/licencia`)

    expect(((await screen.findByLabelText(/^Número/)) as HTMLInputElement).value).toBe(PERSON.cedula)
    await user.click(screen.getByRole('button', { name: 'Emitir licencia' }))
    expect(await screen.findByText('Revise los campos marcados')).toBeTruthy()
    expect(screen.getByText('Elija el tipo de licencia.')).toBeTruthy()

    await user.click(screen.getByRole('combobox', { name: /^Tipo de licencia/ }))
    await user.click(await screen.findByRole('option', { name: /Piloto Comercial - Avión/ }))
    const rail = screen.getByLabelText('Se emitirá')
    expect(await within(rail).findByText(/14 oct 2028 · PENDIENTE INAC/)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Agregar habilitación de tipo' }))
    await user.click(screen.getByRole('combobox', { name: 'Aeronave de la habilitación de tipo 1' }))
    await user.click(await screen.findByRole('option', { name: /B737/ }))
    await user.click(screen.getByRole('combobox', { name: 'Función de la habilitación de tipo 1' }))
    await user.click(await screen.findByRole('option', { name: /Capitán/ }))
    await user.type(screen.getByLabelText('Vencimiento de la habilitación de tipo 1'), '30062027')
    expect(within(rail).getByText('Habilitación de tipo — B737 · Capitán')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Emitir licencia + 1 habilitación' }))
    // Nothing is sent before the operator reviews the data and confirms it.
    const review = await screen.findByRole('dialog', { name: 'Revise la licencia antes de emitirla' })
    expect(api.mock.calls.some(([, i]) => i?.method === 'POST')).toBe(false)
    const licenseSection = within(review).getByRole('region', { name: 'Licencia' })
    expect(licenseSection.textContent).toContain('Emisión de una licencia nueva')
    expect(licenseSection.textContent).toContain('Piloto Comercial - Avión')
    expect(licenseSection.textContent).toContain(PERSON.cedula)
    expect(licenseSection.textContent).toContain('14 oct 2028 · PENDIENTE INAC')
    expect(within(review).getByRole('region', { name: 'Habilitaciones' }).textContent).toContain(
      'Habilitación de tipo — B737 · Capitán',
    )
    await user.click(within(review).getByRole('button', { name: 'Confirmar · Emitir licencia + 1 habilitación' }))
    await waitFor(() => expect(currentLocation()).toBe(`/personal/${PERSON.id}?pagina=licencias`))
    const [, init] = api.mock.calls.find(([, i]) => i?.method === 'POST')!
    expect(json(init!)).toEqual({
      personalId: PERSON.id,
      licenseTypeId: TYPE.id,
      number: PERSON.cedula,
      issueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      observationIds: [],
      addTypeRatings: [{ typeRatingId: B737.id, functionId: PIC.id, expiryDate: '2027-06-30' }],
      addClassRatings: [],
    })
  })

  it('renews a license with its ratings: renew one, remove another (one trámite)', async () => {
    const api = signIn(
      userWith('administrador', 'ambas'),
      formApi({
        licenses: [LICENSE],
        submit: (url) =>
          url.pathname === `/api/licenses/${LICENSE.id}/renew` ? { status: 200, body: LICENSE } : undefined,
      }),
    )
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}/licencia?licencia=${LICENSE.id}`)

    const radio = (await screen.findByRole('radio', { name: /Renovar Piloto Comercial - Avión/ })) as HTMLInputElement
    expect(radio.checked).toBe(true)
    expect(screen.getByText('No válida para vuelos internacionales')).toBeTruthy()
    await user.click(screen.getByRole('checkbox', { name: 'Renovar B737 · Capitán' }))
    await user.type(screen.getByLabelText('Nueva fecha de vencimiento de B737 · Capitán'), '01112027')
    await user.click(screen.getByRole('checkbox', { name: 'Quitar Monomotores Terrestres · C172' }))
    expect(within(screen.getByLabelText('Se emitirá')).getByText(/Monomotores Terrestres · C172/)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Renovar licencia + 1 habilitación' }))
    const review = await screen.findByRole('dialog', { name: 'Revise la renovación antes de confirmarla' })
    const ratings = within(review).getByRole('region', { name: 'Habilitaciones' })
    expect(ratings.textContent).toContain('B737 · Capitán')
    expect(ratings.textContent).toContain('Se retira')
    await user.click(within(review).getByRole('button', { name: 'Confirmar · Renovar licencia + 1 habilitación' }))
    await waitFor(() => expect(currentLocation()).toBe(`/personal/${PERSON.id}?pagina=licencias`))
    const [url, init] = api.mock.calls.find(([, i]) => i?.method === 'POST')!
    expect(new URL(String(url)).pathname).toBe(`/api/licenses/${LICENSE.id}/renew`)
    expect(json(init!)).toMatchObject({
      number: LICENSE.number,
      observationIds: [OBS.id],
      renewTypeRatings: [{ id: LICENSE.typeRatings[0]!.id, expiryDate: '2027-11-01' }],
      removeClassRatingIds: [LICENSE.classRatings[0]!.id],
      addTypeRatings: [],
      addClassRatings: [],
    })
  })

  it('turns a 409 at submit into the blocked page state, with the API reason (D13)', async () => {
    const reason = 'Piloto Comercial - Avión exige un certificado médico vigente de clase 1 (D13).'
    signIn(
      userWith('supervisor', 'licencias'),
      formApi({
        licenses: [LICENSE],
        submit: () => ({ status: 409, body: { statusCode: 409, error: 'Conflict', message: reason } }),
      }),
    )
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}/licencia?licencia=${LICENSE.id}`)

    await user.click(await screen.findByRole('button', { name: 'Renovar licencia' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar · Renovar licencia' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(reason)
    expect(screen.queryByRole('button', { name: 'Renovar licencia' })).toBeNull()
  })
})
