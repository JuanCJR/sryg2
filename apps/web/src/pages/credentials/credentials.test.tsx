// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type {
  AuthUser,
  LicenseDto,
  MedicalCertificateDto,
  PersonMedicalCertificatesDto,
  PersonnelDto,
  PublicVerification,
} from '@sryg/types'
import { sessionStore } from '../../common/services/session'
import { mockApi, type MockHandler } from '../../test/api-mock'
import { TOKEN, renderApp, userWith } from '../../test/render-app'

// Fictitious data only.
const PERSON: PersonnelDto = {
  id: '6c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  cedula: '00000303',
  firstNames: 'Persona',
  lastNames: 'De Prueba Tres',
  documentTypeId: null,
  nationalityId: null,
  birthDate: null,
  address: null,
  email: null,
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

const license = (id: string, number: string, status: LicenseDto['status']): LicenseDto => ({
  id,
  personalId: PERSON.id,
  licenseType: {
    id: '7d000000-0000-4000-8000-000000000001',
    nameEs: 'Piloto Comercial - Avión',
    nameEn: 'Commercial Pilot - Airplane',
    rav60Category: 'piloto_comercial',
    requiredMedicalClass: 'clase_1',
    appliesExpiry: true,
  },
  number,
  issueDate: '2026-02-10',
  expiryDate: '2028-02-10',
  status,
  observations: [],
  typeRatings: [],
  classRatings: [],
  createdAt: '2026-02-10T12:00:00.000Z',
  updatedAt: '2026-02-10T12:00:00.000Z',
})

const LICENSE = license('7d000000-0000-4000-8000-000000000010', '00000303', 'vigente')
const EXPIRED_LICENSE = license('7d000000-0000-4000-8000-000000000011', 'L-VIEJA-01', 'vencida')

const CERT: MedicalCertificateDto = {
  id: '7d000000-0000-4000-8000-000000000020',
  personalId: PERSON.id,
  rav67Class: 'clase_1',
  number: 'C-00000303',
  issueDate: '2026-03-01',
  expiryDate: '2027-03-01',
  restrictions: null,
  observations: [],
  status: 'proxima_a_vencer',
  createdAt: '2026-03-01T12:00:00.000Z',
  updatedAt: '2026-03-01T12:00:00.000Z',
}

const CERTIFICATES: PersonMedicalCertificatesDto = {
  personalId: PERSON.id,
  hasActiveBlock: false,
  alertThresholdDays: { value: 30, isPlaceholder: false },
  items: [CERT],
}

const licensesPath = `/api/personnel/${PERSON.id}/licenses`
const certificatesPath = `/api/personnel/${PERSON.id}/medical-certificates`
const licensePdfPath = `/api/personnel/${PERSON.id}/credentials/license/${LICENSE.id}.pdf`
const medicalPdfPath = `/api/personnel/${PERSON.id}/credentials/medical/${CERT.id}.pdf`

type Reply = { status: number; body?: unknown }

/** mockApi for JSON, plus raw replies (the PDF) for the paths in `raw`. */
function signIn(user: AuthUser, api: MockHandler = () => undefined, raw: Record<string, () => Response> = {}) {
  sessionStore.set(TOKEN)
  const spy = mockApi((url, init) => {
    if (url.pathname === '/api/auth/me') return { status: 200, body: user }
    if (url.pathname === `/api/personnel/${PERSON.id}`) return { status: 200, body: PERSON }
    if (url.pathname === licensesPath) return { status: 200, body: [LICENSE, EXPIRED_LICENSE] }
    if (url.pathname === certificatesPath) return { status: 200, body: CERTIFICATES }
    return api(url, init)
  })
  const json = spy.getMockImplementation()!
  spy.mockImplementation(async (input, init) => {
    const url = new URL(String(input))
    const reply = raw[url.pathname]
    return reply ? reply() : json(input, init)
  })
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:ficticio'), revokeObjectURL: vi.fn() }))
  return spy
}

const pdf = () =>
  new Response(new Blob(['%PDF-1.3 ficticio'], { type: 'application/pdf' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="credencial-licencia-00000303.pdf"',
    },
  })
const conflict = (message: string) => () =>
  new Response(JSON.stringify({ statusCode: 409, error: 'Conflict', message }), {
    status: 409,
    headers: { 'Content-Type': 'application/json' },
  })

const callsTo = (spy: ReturnType<typeof mockApi>, path: string) =>
  spy.mock.calls.filter(([url]) => new URL(String(url)).pathname === path)

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.clear()
})

describe('"Imprimir credencial" in the Expediente (OUT-05, D7)', () => {
  it('is not offered to Consulta (D1)', async () => {
    signIn(userWith('consulta', 'ambas'))
    renderApp(`/personal/${PERSON.id}`)
    await screen.findByRole('heading', { name: PERSON.cedula, level: 1 })
    expect(screen.queryByRole('button', { name: /Imprimir credencial/ })).toBeNull()
  })

  it('lets the Admin choose a license or a certificate and downloads the license PDF', async () => {
    const spy = signIn(userWith('administrador', 'ambas'), undefined, { [licensePdfPath]: pdf })
    renderApp(`/personal/${PERSON.id}`)
    await userEvent.click(await screen.findByRole('button', { name: /Imprimir credencial/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Imprimir credencial' })
    const licenseOption = await within(dialog).findByRole('radio', { name: /Licencia 00000303/ })
    expect(within(dialog).getByRole('radio', { name: /Certificado médico C-00000303/ })).toBeTruthy()
    expect(within(dialog).getByText(/Primera clase/)).toBeTruthy()
    // An expired credential is listed but cannot be chosen (409 otherwise).
    const expired = within(dialog).getByRole('radio', { name: /Licencia L-VIEJA-01/ }) as HTMLInputElement
    expect(expired.disabled).toBe(true)

    await userEvent.click(licenseOption)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Imprimir' }))

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob)))
    const [call] = callsTo(spy, licensePdfPath)
    expect(new Headers(call![1]?.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`)
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Imprimir credencial' })).toBeNull())
  })

  it('offers a Supervisor only the credentials of their area (D24)', async () => {
    const spy = signIn(userWith('supervisor', 'medicina'))
    renderApp(`/personal/${PERSON.id}`)
    await userEvent.click(await screen.findByRole('button', { name: /Imprimir credencial/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Imprimir credencial' })
    await within(dialog).findByRole('radio', { name: /Certificado médico C-00000303/ })
    expect(within(dialog).queryByRole('radio', { name: /Licencia/ })).toBeNull()
    expect(callsTo(spy, licensesPath)).toHaveLength(0)
  })

  it('shows the reason when the API refuses to print (409: active block)', async () => {
    signIn(userWith('administrador', 'ambas'), undefined, {
      [medicalPdfPath]: conflict('La persona tiene un bloqueo activo: la credencial no se puede emitir.'),
    })
    renderApp(`/personal/${PERSON.id}`)
    await userEvent.click(await screen.findByRole('button', { name: /Imprimir credencial/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Imprimir credencial' })
    await userEvent.click(await within(dialog).findByRole('radio', { name: /Certificado médico/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Imprimir' }))
    expect((await within(dialog).findByRole('status')).textContent).toMatch(/bloqueo activo/)
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('asks to choose before printing', async () => {
    signIn(userWith('administrador', 'ambas'))
    renderApp(`/personal/${PERSON.id}`)
    await userEvent.click(await screen.findByRole('button', { name: /Imprimir credencial/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Imprimir credencial' })
    await within(dialog).findByRole('radio', { name: /Licencia 00000303/ })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Imprimir' }))
    expect((await within(dialog).findByRole('status')).textContent).toMatch(/Elija la credencial/)
  })
})

describe('/verificar/:token (OUT-04, D9)', () => {
  const TOKEN_QR = '8e000000-0000-4000-8000-000000000001'
  const verifyPath = `/api/public/verify/${TOKEN_QR}`

  function publicApi(reply: Reply) {
    return mockApi((url) => (url.pathname === verifyPath ? reply : undefined))
  }

  it('shows only the kind, number, status and expiry, without signing in', async () => {
    const body: PublicVerification = {
      kind: 'licencia',
      number: '00000303',
      status: 'vigente',
      expiryDate: '2028-02-10',
    }
    const spy = publicApi({ status: 200, body })
    renderApp(`/verificar/${TOKEN_QR}`)

    expect(await screen.findByText('Licencia')).toBeTruthy()
    expect(screen.getByText('00000303')).toBeTruthy()
    expect(screen.getByText('Vigente')).toBeTruthy()
    expect(screen.getByText('10 feb 2028')).toBeTruthy()
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(callsTo(spy, '/api/auth/me')).toHaveLength(0)
  })

  it('names a certificate without expiry date and a blocked status', async () => {
    publicApi({
      status: 200,
      body: { kind: 'certificado_medico', number: 'C-1', status: 'bloqueada', expiryDate: null },
    })
    renderApp(`/verificar/${TOKEN_QR}`)
    expect(await screen.findByText('Certificado médico')).toBeTruthy()
    expect(screen.getByText('Bloqueada')).toBeTruthy()
    expect(screen.getByText('No vence')).toBeTruthy()
  })

  it('says when the code does not match any credential (404)', async () => {
    publicApi({ status: 404, body: { statusCode: 404, error: 'Not Found', message: 'Credencial no encontrada' } })
    renderApp(`/verificar/${TOKEN_QR}`)
    expect(await screen.findByText(/No encontramos una credencial/)).toBeTruthy()
  })

  it('asks to wait when the check is throttled (429)', async () => {
    publicApi({ status: 429, body: { statusCode: 429, message: 'Too Many Requests' } })
    renderApp(`/verificar/${TOKEN_QR}`)
    expect(await screen.findByText(/Demasiadas consultas/)).toBeTruthy()
  })
})
