// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  medicalExpiryDate,
  type AuthUser,
  type MedicalCertificateDto,
  type MedicalCertificateHistoryEntryDto,
  type MedicalValidityDto,
  type PersonMedicalCertificatesDto,
  type PersonnelDto,
} from '@sryg/types'
import { sessionStore } from '../../common/services/session'
import { mockApi, type MockHandler } from '../../test/api-mock'
import { TOKEN, currentLocation, renderApp, userWith } from '../../test/render-app'

// Fictitious data only.
const PERSON: PersonnelDto = {
  id: '5a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  cedula: '00000202',
  firstNames: 'Persona',
  lastNames: 'De Prueba Dos',
  documentTypeId: null,
  nationalityId: null,
  birthDate: '1988-07-15',
  address: null,
  email: null,
  phone: null,
  bloodType: 'a_pos',
  cargo: null,
  dependencia: null,
  category: 'piloto_privado',
  status: 'activo',
  hasPhoto: false,
  hasSignature: false,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-02T13:05:00.000Z',
}

const LENSES = { id: '7b2e4c6a-1d3f-4e5a-9b8c-0d1e2f3a4b5c', nameEs: 'Debe usar lentes correctivos', nameEn: null }
const NIGHT = { id: '8c3f5d7b-2e4a-4f6b-8c9d-1e2f3a4b5c6d', nameEs: 'No apto para vuelo nocturno', nameEn: null }

const CERT: MedicalCertificateDto = {
  id: '9d4a6e8c-3f5b-4a7c-9d0e-2f3a4b5c6d7e',
  personalId: PERSON.id,
  rav67Class: 'clase_2',
  number: '00000202',
  issueDate: '2026-03-10',
  expiryDate: '2027-03-10',
  restrictions: 'Solo vuelo diurno',
  observations: [LENSES],
  status: 'vigente',
  createdAt: '2026-03-10T12:00:00.000Z',
  updatedAt: '2026-03-10T12:00:00.000Z',
}

const VALIDITY: MedicalValidityDto = {
  clase_1: { value: 6, isPlaceholder: false },
  clase_2: { value: 12, isPlaceholder: true },
  clase_3: { value: 24, isPlaceholder: true },
}

const listOf = (items: MedicalCertificateDto[], extra: Partial<PersonMedicalCertificatesDto> = {}) => ({
  status: 200,
  body: {
    personalId: PERSON.id,
    hasActiveBlock: false,
    alertThresholdDays: { value: 30, isPlaceholder: true },
    items,
    ...extra,
  } satisfies PersonMedicalCertificatesDto,
})

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const label = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`
}
const localToday = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function signIn(user: AuthUser, api: MockHandler) {
  sessionStore.set(TOKEN)
  return mockApi((url, init) => {
    if (url.pathname === '/api/auth/me') return { status: 200, body: user }
    if (url.pathname === `/api/personnel/${PERSON.id}`) return { status: 200, body: PERSON }
    if (url.pathname === '/api/medical-certificates/validity') return { status: 200, body: VALIDITY }
    if (url.pathname === '/api/catalogs/medical-observations/options') return { status: 200, body: [LENSES, NIGHT] }
    return api(url, init)
  })
}

const certificatesPath = `/api/personnel/${PERSON.id}/medical-certificates`
const bodyOf = (spy: ReturnType<typeof mockApi>, path: string) => {
  const call = spy.mock.calls.find(([url, init]) => new URL(String(url)).pathname === path && init?.method === 'POST')
  return call ? JSON.parse(String(call[1]?.body)) : undefined
}

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.clear()
})

describe('Médico page key of the Expediente (MED-05, MED-07)', () => {
  it('lists the certificates with class, restrictions, observations, status and the threshold mark (D3)', async () => {
    signIn(userWith('consulta', 'ambas'), (url) => (url.pathname === certificatesPath ? listOf([CERT]) : undefined))
    renderApp(`/personal/${PERSON.id}?pagina=medico`)

    const table = await screen.findByRole('table', { name: 'Certificados médicos' })
    const row = within(table).getAllByRole('row')[1]!
    expect(row.textContent).toContain('Segunda clase')
    expect(row.textContent).toContain('Solo vuelo diurno')
    expect(row.textContent).toContain('Debe usar lentes correctivos')
    expect(row.textContent).toContain('10 mar 2027')
    expect(row.textContent).toContain('Activa')
    expect(screen.getByText(/Umbral de aviso: 30 días/).textContent).toContain('PENDIENTE INAC')
    expect(screen.getByText('Este sistema no almacena datos clínicos')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Registrar o renovar certificado/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Historial/ })).toBeNull()
  })

  it('orders the columns Nombre, detail, dates and Estado last, and pages a long list ten at a time', async () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      ...CERT,
      id: `7c000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      number: `M-${String(index + 1).padStart(2, '0')}`,
    }))
    signIn(userWith('consulta', 'ambas'), (url) => (url.pathname === certificatesPath ? listOf(many) : undefined))
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}?pagina=medico`)

    const table = await screen.findByRole('table', { name: 'Certificados médicos' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Nombre', 'Observaciones y restricciones', 'Emitida', 'Vence', 'Restante', 'Estado'])
    expect(within(table).getAllByRole('row')).toHaveLength(11)
    const nav = screen.getByRole('navigation', { name: 'Paginación' })
    expect(nav.textContent).toMatch(/Mostrando\s*1–10\s*de\s*12/)
    await user.click(within(nav).getByRole('button', { name: 'Página 2' }))
    expect(within(screen.getByRole('table', { name: 'Certificados médicos' })).getAllByRole('row')).toHaveLength(3)
  })

  it('shows the empty state, and opens the form for the Medicina Supervisor (D24)', async () => {
    signIn(userWith('supervisor', 'medicina'), (url) => (url.pathname === certificatesPath ? listOf([]) : undefined))
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}?pagina=medico`)

    expect(await screen.findByText('Sin certificados médicos registrados.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /Registrar o renovar certificado/ }))
    expect(currentLocation()).toBe(`/personal/${PERSON.id}/certificado-medico`)
  })

  it('hides the form action from the Licencias Supervisor and retries after an error', async () => {
    let fail = true
    signIn(userWith('supervisor', 'licencias'), (url) =>
      url.pathname === certificatesPath ? (fail ? { status: 503, body: { message: 'x' } } : listOf([CERT])) : undefined,
    )
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}?pagina=medico`)

    expect(await screen.findByText('No se pudieron cargar los certificados médicos')).toBeTruthy()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Certificados médicos' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Registrar o renovar certificado/ })).toBeNull()
  })

  it('marks the certificates as blocked while the person has an active block', async () => {
    signIn(userWith('administrador', 'ambas'), (url) =>
      url.pathname === certificatesPath
        ? listOf([{ ...CERT, status: 'bloqueada' }], { hasActiveBlock: true })
        : undefined,
    )
    renderApp(`/personal/${PERSON.id}?pagina=medico`)

    const table = await screen.findByRole('table', { name: 'Certificados médicos' })
    expect(within(table).getAllByRole('row')[1]!.textContent).toContain('Bloqueada')
    expect(screen.getByText(/bloqueo activo/)).toBeTruthy()
  })

  it('shows the history of a certificate to whoever reads the audit', async () => {
    const history: MedicalCertificateHistoryEntryDto[] = [
      {
        id: 2,
        action: 'renovar',
        occurredAt: '2026-09-01T15:30:00.000Z',
        actor: { id: '1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b', fullName: 'Supervisora Ficticia' },
        changes: null,
      },
      {
        id: 1,
        action: 'emitir',
        occurredAt: '2026-03-10T12:00:00.000Z',
        actor: { id: '1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b', fullName: 'Supervisora Ficticia' },
        changes: null,
      },
    ]
    signIn(userWith('supervisor', 'licencias'), (url) => {
      if (url.pathname === certificatesPath) return listOf([CERT])
      if (url.pathname === `/api/medical-certificates/${CERT.id}/history`) return { status: 200, body: history }
      return undefined
    })
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}?pagina=medico`)

    await user.click(await screen.findByRole('button', { name: /Historial · Segunda clase/ }))
    const list = await screen.findByRole('list', { name: 'Historial del certificado' })
    const items = within(list)
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(items[0]).toContain('Renovación')
    expect(items[0]).toContain('Supervisora Ficticia')
    expect(items[0]).toContain('01 sep 2026')
    expect(items[1]).toContain('Registro')
  })
})

describe('Certificado médico form page (MED-01, MED-05, MED-06)', () => {
  it('registers a certificate: number from the document (D22), expiry from the class validity (D3)', async () => {
    const api = signIn(userWith('supervisor', 'medicina'), (url, init) => {
      if (url.pathname === certificatesPath && init.method === 'POST') return { status: 201, body: CERT }
      if (url.pathname === certificatesPath) return listOf([])
      return undefined
    })
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}/certificado-medico`)

    expect(await screen.findByText('Este sistema no almacena datos clínicos')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Registrar o renovar certificado médico', level: 1 })).toBeTruthy()
    expect((screen.getByLabelText(/Número del certificado/) as HTMLInputElement).value).toBe('00000202')
    const issue = screen.getByLabelText(/Fecha de emisión/) as HTMLInputElement
    expect(issue.value).toBe(localToday().split('-').reverse().join('/'))

    await user.selectOptions(screen.getByLabelText(/Clase RAV 67/), 'clase_2')
    await user.clear(issue)
    await user.type(issue, '31082026')
    const expiry = screen.getByTestId('expiry-preview')
    expect(expiry.textContent).toContain(label(medicalExpiryDate('2026-08-31', 12)))
    expect(expiry.textContent).toContain('PENDIENTE INAC')

    await user.click(screen.getByLabelText(/Agregar observación médica/))
    await user.click(await screen.findByRole('option', { name: /No apto para vuelo nocturno/ }))
    expect(screen.getByRole('button', { name: 'Quitar No apto para vuelo nocturno' })).toBeTruthy()
    await user.type(screen.getByLabelText(/Restricciones/), 'Solo vuelo diurno')
    await user.click(screen.getByRole('button', { name: 'Registrar certificado' }))

    await waitFor(() => expect(currentLocation()).toBe(`/personal/${PERSON.id}?pagina=medico`))
    expect(bodyOf(api, certificatesPath)).toEqual({
      rav67Class: 'clase_2',
      number: '00000202',
      issueDate: '2026-08-31',
      observationIds: [NIGHT.id],
      restrictions: 'Solo vuelo diurno',
    })
  })

  it('renews the latest certificate by default, keeping its class, observations and restrictions', async () => {
    const renewPath = `/api/medical-certificates/${CERT.id}/renew`
    const api = signIn(userWith('administrador', 'licencias'), (url, init) => {
      if (url.pathname === renewPath && init.method === 'POST') return { status: 200, body: CERT }
      if (url.pathname === certificatesPath) return listOf([CERT])
      return undefined
    })
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}/certificado-medico`)

    const renew = await screen.findByRole('radio', { name: /Renovar · Segunda clase/ })
    expect((renew as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText(/Clase RAV 67/) as HTMLSelectElement).disabled).toBe(true)
    expect((screen.getByLabelText(/Restricciones/) as HTMLTextAreaElement).value).toBe('Solo vuelo diurno')
    await user.click(screen.getByRole('button', { name: 'Quitar Debe usar lentes correctivos' }))
    await user.click(screen.getByRole('button', { name: 'Renovar certificado' }))

    await waitFor(() => expect(currentLocation()).toBe(`/personal/${PERSON.id}?pagina=medico`))
    expect(bodyOf(api, renewPath)).toEqual({
      number: '00000202',
      issueDate: localToday(),
      observationIds: [],
      restrictions: 'Solo vuelo diurno',
    })
  })

  it('switches to a new registration when the operator chooses it', async () => {
    signIn(userWith('administrador', 'ambas'), (url) =>
      url.pathname === certificatesPath ? listOf([CERT]) : undefined,
    )
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}/certificado-medico`)

    await user.click(await screen.findByRole('radio', { name: 'Registrar un certificado nuevo' }))
    expect((screen.getByLabelText(/Clase RAV 67/) as HTMLSelectElement).disabled).toBe(false)
    expect((screen.getByLabelText(/Restricciones/) as HTMLTextAreaElement).value).toBe('')
    expect(screen.getByRole('button', { name: 'Registrar certificado' })).toBeTruthy()
  })

  it('validates before sending: a class and an issue date are required', async () => {
    const api = signIn(userWith('supervisor', 'medicina'), (url) =>
      url.pathname === certificatesPath ? listOf([]) : undefined,
    )
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}/certificado-medico`)

    await user.clear(await screen.findByLabelText(/Fecha de emisión/))
    await user.click(screen.getByRole('button', { name: 'Registrar certificado' }))
    expect(await screen.findByText('Revise los campos marcados')).toBeTruthy()
    expect(screen.getByText('Seleccione la clase RAV 67.')).toBeTruthy()
    expect(screen.getByText('Ingrese la fecha de emisión.')).toBeTruthy()
    expect(bodyOf(api, certificatesPath)).toBeUndefined()
  })

  it('shows the blocked state instead of the form while the person has an active block (BR-07)', async () => {
    signIn(userWith('supervisor', 'medicina'), (url) =>
      url.pathname === certificatesPath ? listOf([CERT], { hasActiveBlock: true }) : undefined,
    )
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}/certificado-medico`)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Bloqueo activo')
    expect(screen.queryByRole('button', { name: /Renovar certificado|Registrar certificado/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Volver al expediente' }))
    expect(currentLocation()).toBe(`/personal/${PERSON.id}?pagina=medico`)
  })

  it('turns a 409 at submit into the blocked state with the reason from the server', async () => {
    signIn(userWith('supervisor', 'medicina'), (url, init) => {
      if (url.pathname === certificatesPath && init.method === 'POST')
        return {
          status: 409,
          body: { statusCode: 409, error: 'Conflict', message: 'La persona tiene un bloqueo activo (ficticio).' },
        }
      if (url.pathname === certificatesPath) return listOf([])
      return undefined
    })
    const user = userEvent.setup()
    renderApp(`/personal/${PERSON.id}/certificado-medico`)

    await user.selectOptions(await screen.findByLabelText(/Clase RAV 67/), 'clase_1')
    await user.click(screen.getByRole('button', { name: 'Registrar certificado' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('La persona tiene un bloqueo activo (ficticio).')
    expect(screen.queryByRole('button', { name: 'Registrar certificado' })).toBeNull()
  })

  it('answers 404 for an unknown person', async () => {
    sessionStore.set(TOKEN)
    mockApi((url) =>
      url.pathname === '/api/auth/me' ? { status: 200, body: userWith('supervisor', 'medicina') } : undefined,
    )
    renderApp(`/personal/${PERSON.id}/certificado-medico`)
    expect(await screen.findByRole('heading', { name: 'Persona no encontrada' })).toBeTruthy()
  })
})
