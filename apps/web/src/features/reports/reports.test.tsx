// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ActiveBlockReportRow, AuthUser, ConsolidatedReportRow, ExpiryReportRow, ReportId } from '@sryg/types'
import { sessionStore } from '../../shared/session/session'
import { authorizationOf, mockApi, type MockHandler } from '../../test/api-mock'
import { TOKEN, renderApp, userWith } from '../../test/render-app'

const EXPIRED: ExpiryReportRow = {
  personalId: '0b6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e11',
  cedula: '10000101',
  fullName: 'Persona De Prueba Uno',
  credentialKind: 'licencia',
  credentialId: '1c6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e12',
  description: 'Piloto Comercial - Avión',
  licenseTypeName: 'Piloto Comercial - Avión',
  rav60Category: 'piloto_comercial',
  number: '10000101',
  expiryDate: '2026-10-04',
  daysRemaining: -10,
  status: 'vencida',
}
const NEAR: ExpiryReportRow = {
  ...EXPIRED,
  personalId: '2d6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e13',
  cedula: '10000102',
  fullName: 'Persona De Prueba Dos',
  credentialKind: 'certificado_medico',
  credentialId: '3e6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e14',
  description: 'Clase 1',
  licenseTypeName: null,
  rav60Category: null,
  expiryDate: '2026-10-19',
  daysRemaining: 5,
  status: 'proxima_a_vencer',
}
const CONSOLIDATED: ConsolidatedReportRow = {
  personalId: EXPIRED.personalId,
  cedula: EXPIRED.cedula,
  fullName: EXPIRED.fullName,
  licenses: [
    {
      licenseTypeName: 'Piloto Comercial - Avión',
      rav60Category: 'piloto_comercial',
      number: '10000101',
      expiryDate: '2026-10-04',
      status: 'vencida',
    },
  ],
  ratings: { total: 2, expired: 1, nearExpiry: 0 },
  medical: { rav67Class: 'clase_1', number: '10000101', expiryDate: '2027-01-10', status: 'vigente' },
  activeBlocks: 0,
  nextExpiryDate: '2026-10-04',
  status: 'vencida',
}
const BLOCK: ActiveBlockReportRow = {
  blockId: '4f6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e15',
  personalId: NEAR.personalId,
  cedula: NEAR.cedula,
  fullName: NEAR.fullName,
  type: 'medico',
  reason: 'Impedimento ficticio',
  createdAt: '2026-10-10T14:05:00.000Z',
  createdByName: 'Supervisor Ficticio',
}

const reportPage = (report: ReportId, items: unknown[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    report,
    generatedAt: '2026-10-14T12:00:00.000Z',
    today: '2026-10-14',
    thresholdDays: 30,
    thresholdIsPlaceholder: true,
    items,
    page: 1,
    pageSize: 50,
    total: items.length,
    ...extra,
  },
})

const ROWS: Record<ReportId, unknown[]> = {
  vencimientos: [EXPIRED, NEAR],
  estado_consolidado: [CONSOLIDATED],
  bloqueos_activos: [BLOCK],
}

function signIn(user: AuthUser, api: MockHandler = defaultApi) {
  sessionStore.set(TOKEN)
  return mockApi((url, init) => (url.pathname === '/api/auth/me' ? { status: 200, body: user } : api(url, init)))
}

function defaultApi(url: URL) {
  const match = /^\/api\/reports\/([a-z_]+)$/.exec(url.pathname)
  return match ? reportPage(match[1] as ReportId, ROWS[match[1] as ReportId]) : undefined
}

const reportCalls = (api: ReturnType<typeof mockApi>) =>
  api.mock.calls.map(([url]) => new URL(String(url))).filter((url) => url.pathname.startsWith('/api/reports/'))

beforeEach(() => {
  // jsdom cannot navigate to the file: the click is only recorded.
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:ficticio'), revokeObjectURL: vi.fn() }))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  sessionStore.clear()
})

describe('Reportes (D10)', () => {
  it('shows Consulta only report 1, with its rows and statuses, and no export', async () => {
    signIn(userWith('consulta', 'medicina'))
    renderApp('/reportes')

    expect(await screen.findByRole('heading', { name: 'Reportes', level: 1 })).toBeTruthy()
    const row = await screen.findByRole('row', { name: /Persona De Prueba Uno/ })
    expect(within(row).getByText('Licencia')).toBeTruthy()
    expect(within(row).getByText('Vencida')).toBeTruthy()
    expect(within(row).getByText('−10 d')).toBeTruthy()
    expect(
      within(screen.getByRole('row', { name: /Persona De Prueba Dos/ })).getByText('Próxima a vencer'),
    ).toBeTruthy()
    expect(screen.getByText(/Umbral de próxima a vencer: 30 días/)).toBeTruthy()
    expect(screen.getByText('PENDIENTE INAC')).toBeTruthy()

    const picker = screen.getByRole('radiogroup', { name: 'Reporte' })
    expect(
      within(picker)
        .getAllByRole('radio')
        .map((r) => r.getAttribute('aria-label') ?? r.textContent),
    ).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Exportar/ })).toBeNull()
  })

  it('lets the Admin switch to the consolidated status and the active blocks', async () => {
    const api = signIn(userWith('administrador', 'ambas'))
    const user = userEvent.setup()
    renderApp('/reportes')
    await screen.findByRole('row', { name: /Persona De Prueba Uno/ })

    await user.click(screen.getByRole('radio', { name: /Estado consolidado/ }))
    const row = await screen.findByRole('row', { name: /Persona De Prueba Uno/ })
    expect(within(row).getByText(/Piloto Comercial - Avión/)).toBeTruthy()
    expect(within(row).getByText('1 / 0 / 2')).toBeTruthy()
    expect(within(row).getByText(/Clase 1/)).toBeTruthy()

    await user.click(screen.getByRole('radio', { name: /Bloqueos activos/ }))
    const block = await screen.findByRole('row', { name: /Persona De Prueba Dos/ })
    expect(within(block).getByText('Médico')).toBeTruthy()
    expect(within(block).getByText('Impedimento ficticio')).toBeTruthy()
    expect(within(block).getByText('Supervisor Ficticio')).toBeTruthy()
    // Blocks have no status filter.
    expect(screen.queryByLabelText('Estado')).toBeNull()

    expect(reportCalls(api).map((url) => url.pathname)).toEqual([
      '/api/reports/vencimientos',
      '/api/reports/estado_consolidado',
      '/api/reports/bloqueos_activos',
    ])
  })

  it('sends the status, RAV 60 category and date filters to the API', async () => {
    const api = signIn(userWith('supervisor', 'licencias'))
    const user = userEvent.setup()
    renderApp('/reportes')
    await screen.findByRole('row', { name: /Persona De Prueba Uno/ })

    await user.selectOptions(screen.getByLabelText('Estado'), 'vencida')
    await user.selectOptions(screen.getByLabelText('Categoría RAV 60'), 'piloto_comercial')
    await user.type(screen.getByLabelText('Vencimiento desde'), '01102026')
    await user.type(screen.getByLabelText('Vencimiento hasta'), '31102026')

    await waitFor(() => {
      const last = reportCalls(api).at(-1)!
      expect(Object.fromEntries(last.searchParams)).toMatchObject({
        status: 'vencida',
        rav60Category: 'piloto_comercial',
        from: '2026-10-01',
        to: '2026-10-31',
      })
    })
  })

  it('shows the no-results state and the error state with retry', async () => {
    let fail = true
    signIn(userWith('administrador', 'ambas'), (url) =>
      url.pathname.startsWith('/api/reports/')
        ? fail
          ? { status: 503, body: { message: 'x' } }
          : reportPage('vencimientos', [])
        : undefined,
    )
    const user = userEvent.setup()
    renderApp('/reportes')

    expect(await screen.findByText('No se pudo generar el reporte')).toBeTruthy()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Sin resultados para estos filtros')).toBeTruthy()
  })

  it('downloads the export with the token and the current filters', async () => {
    const api = signIn(userWith('supervisor', 'medicina'), (url) => {
      if (url.pathname === '/api/reports/vencimientos/export') return { status: 200, body: 'csv' }
      return defaultApi(url)
    })
    const user = userEvent.setup()
    renderApp('/reportes')
    await screen.findByRole('row', { name: /Persona De Prueba Uno/ })

    await user.selectOptions(screen.getByLabelText('Estado'), 'proxima_a_vencer')
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }))

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob)))
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1)
    const call = api.mock.calls.find(([url]) => String(url).includes('/export'))!
    const url = new URL(String(call[0]))
    expect(Object.fromEntries(url.searchParams)).toEqual({ format: 'csv', status: 'proxima_a_vencer' })
    expect(authorizationOf(call[1])).toBe(`Bearer ${TOKEN}`)
    expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeTruthy()
  })
})
