// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AuthUser, GraphicResourceDto, SettingsParametersDto } from '@sryg/types'
import { sessionStore } from '../../shared/session/session'
import { mockApi, type MockHandler } from '../../test/api-mock'
import { TOKEN, currentLocation, renderApp, userWith } from '../../test/render-app'

const AT = '2026-10-01T12:00:00.000Z'
const param = (value: number, isPlaceholder: boolean) => ({ value, isPlaceholder, updatedAt: AT })

const PLACEHOLDERS: SettingsParametersDto = {
  alertThresholdDays: param(30, true),
  medicalValidityMonths: { clase_1: param(12, true), clase_2: param(12, true), clase_3: param(12, true) },
}
const SAVED: SettingsParametersDto = {
  alertThresholdDays: param(45, false),
  medicalValidityMonths: { clase_1: param(6, false), clase_2: param(12, false), clase_3: param(24, false) },
}
const NO_IMAGES: GraphicResourceDto[] = [
  { kind: 'logo_inac', configured: false, mime: null, size: null, updatedAt: null },
  { kind: 'firma_presidente', configured: false, mime: null, size: null, updatedAt: null },
]
const WITH_LOGO: GraphicResourceDto[] = [
  { kind: 'logo_inac', configured: true, mime: 'image/png', size: 2048, updatedAt: AT },
  NO_IMAGES[1]!,
]

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function signIn(user: AuthUser, api: MockHandler) {
  sessionStore.set(TOKEN)
  return mockApi((url, init) => (url.pathname === '/api/auth/me' ? { status: 200, body: user } : api(url, init)))
}

/** A fake settings API that keeps what the page saves. */
function settingsApi(initial: SettingsParametersDto, resources: GraphicResourceDto[] = NO_IMAGES) {
  let parameters = initial
  let images = resources
  const handler: MockHandler = (url, init) => {
    const method = init.method ?? 'GET'
    if (url.pathname === '/api/settings/parameters' && method === 'GET') return { status: 200, body: parameters }
    if (url.pathname === '/api/settings/parameters/alert-threshold' && method === 'PUT') {
      const { days } = JSON.parse(String(init.body)) as { days: number }
      parameters = { ...parameters, alertThresholdDays: param(days, false) }
      return { status: 200, body: parameters }
    }
    if (url.pathname === '/api/settings/parameters/medical-validity' && method === 'PUT') {
      const body = JSON.parse(String(init.body)) as Record<'clase_1' | 'clase_2' | 'clase_3', number>
      parameters = {
        ...parameters,
        medicalValidityMonths: {
          clase_1: param(body.clase_1, false),
          clase_2: param(body.clase_2, false),
          clase_3: param(body.clase_3, false),
        },
      }
      return { status: 200, body: parameters }
    }
    if (url.pathname === '/api/settings/graphic-resources') return { status: 200, body: images }
    const kind = url.pathname.match(/^\/api\/settings\/graphic-resources\/(\w+)$/)?.[1]
    if (kind && method === 'PUT') {
      const file = init.body as File
      const saved: GraphicResourceDto = {
        kind: kind as GraphicResourceDto['kind'],
        configured: true,
        mime: file.type as 'image/png',
        size: file.size,
        updatedAt: AT,
      }
      images = images.map((r) => (r.kind === kind ? saved : r))
      return { status: 200, body: saved }
    }
    if (kind) return images.find((r) => r.kind === kind)?.configured ? { status: 200, body: {} } : undefined
    return undefined
  }
  return handler
}

const admin = userWith('administrador', 'ambas')
const calls = (spy: ReturnType<typeof mockApi>, method: string) =>
  spy.mock.calls
    .map(([input, init]) => ({ url: new URL(String(input)), init: init ?? {} }))
    .filter(({ init }) => (init.method ?? 'GET') === method)
const section = (name: string) => screen.getByRole('group', { name })

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.clear()
})

describe('Parámetros (página 12, D3, D15, D18)', () => {
  it('is Admin only', async () => {
    signIn(userWith('supervisor', 'ambas'), settingsApi(PLACEHOLDERS))
    renderApp('/parametros')
    expect(await screen.findByText('Acceso restringido')).toBeTruthy()
  })

  it('shows the three sections and marks every placeholder as PENDIENTE INAC', async () => {
    signIn(admin, settingsApi(PLACEHOLDERS))
    renderApp('/parametros')

    const vigencias = await screen.findByRole('group', { name: 'Vigencias' })
    expect(screen.getByRole('heading', { level: 1, name: 'Parámetros' })).toBeTruthy()
    expect((within(vigencias).getByLabelText(/Clase 1/) as HTMLInputElement).value).toBe('12')
    expect(within(vigencias).getAllByText('PENDIENTE INAC')).toHaveLength(3)
    const alertas = section('Alertas')
    expect((within(alertas).getByLabelText(/Umbral/) as HTMLInputElement).value).toBe('30')
    expect(within(alertas).getByText('PENDIENTE INAC')).toBeTruthy()
    const credencial = section('Credencial')
    expect(within(credencial).getByText('Logo del INAC')).toBeTruthy()
    expect(within(credencial).getByText('Firma del Presidente')).toBeTruthy()
    expect(within(credencial).getAllByText('PENDIENTE INAC')).toHaveLength(2)
  })

  it('shows no mark for values the Admin already saved and previews a loaded image', async () => {
    signIn(admin, settingsApi(SAVED, WITH_LOGO))
    renderApp('/parametros')

    expect((await screen.findByLabelText(/Umbral/)) as HTMLInputElement).toHaveProperty('value', '45')
    expect(within(section('Vigencias')).queryByText('PENDIENTE INAC')).toBeNull()
    expect(within(section('Alertas')).queryByText('PENDIENTE INAC')).toBeNull()
    const credencial = section('Credencial')
    expect(within(credencial).getAllByText('PENDIENTE INAC')).toHaveLength(1)
    expect(await within(credencial).findByRole('img', { name: 'Logo del INAC actual' })).toBeTruthy()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    const api = settingsApi(PLACEHOLDERS)
    signIn(admin, (url, init) => (fail ? { status: 503, body: { message: 'x' } } : api(url, init)))
    const user = userEvent.setup()
    renderApp('/parametros')

    expect(await screen.findByText('No se pudieron cargar los parámetros')).toBeTruthy()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByLabelText(/Umbral/)).toBeTruthy()
  })

  it('saves the shown values, which clears the PENDIENTE INAC marks', async () => {
    const spy = signIn(admin, settingsApi(PLACEHOLDERS))
    const user = userEvent.setup()
    renderApp('/parametros')

    const threshold = await screen.findByLabelText(/Umbral/)
    await user.clear(threshold)
    await user.type(threshold, '60')
    await user.click(screen.getByRole('button', { name: 'Guardar parámetros' }))

    await waitFor(() => expect(screen.queryAllByText('PENDIENTE INAC')).toHaveLength(2))
    const puts = calls(spy, 'PUT')
    expect(puts.map(({ url }) => url.pathname)).toEqual([
      '/api/settings/parameters/medical-validity',
      '/api/settings/parameters/alert-threshold',
    ])
    expect(JSON.parse(String(puts[0]!.init.body))).toEqual({ clase_1: 12, clase_2: 12, clase_3: 12 })
    expect(JSON.parse(String(puts[1]!.init.body))).toEqual({ days: 60 })
    expect(await screen.findByText('Parámetros guardados.')).toBeTruthy()
  })

  it('sends nothing when there is no change and no placeholder to confirm', async () => {
    const spy = signIn(admin, settingsApi(SAVED, WITH_LOGO))
    const user = userEvent.setup()
    renderApp('/parametros')

    await screen.findByLabelText(/Umbral/)
    await user.click(screen.getByRole('button', { name: 'Guardar parámetros' }))
    expect(await screen.findByText('No hay cambios para guardar.')).toBeTruthy()
    expect(calls(spy, 'PUT')).toHaveLength(0)
  })

  it('rejects a value that is not a positive whole number before sending anything', async () => {
    const spy = signIn(admin, settingsApi(PLACEHOLDERS))
    const user = userEvent.setup()
    renderApp('/parametros')

    const clase2 = await screen.findByLabelText(/Clase 2/)
    await user.clear(clase2)
    await user.type(clase2, '0')
    await user.click(screen.getByRole('button', { name: 'Guardar parámetros' }))

    expect(await screen.findByText('Revise los campos marcados')).toBeTruthy()
    expect(screen.getByText('Ingrese un número entero mayor que cero.')).toBeTruthy()
    expect(calls(spy, 'PUT')).toHaveLength(0)
  })

  it('uploads a PNG chosen for the logo and rejects files that are not PNG/JPEG or exceed 500 KB', async () => {
    const spy = signIn(admin, settingsApi(SAVED))
    const user = userEvent.setup({ applyAccept: false })
    renderApp('/parametros')

    const logo = await screen.findByLabelText('Archivo del logo del INAC')
    await user.upload(logo, new File(['GIF89a'], 'logo.gif', { type: 'image/gif' }))
    expect(await screen.findByText('Use una imagen PNG o JPEG.')).toBeTruthy()
    await user.upload(logo, new File([new Uint8Array(500 * 1024 + 1)], 'logo.png', { type: 'image/png' }))
    expect(await screen.findByText('La imagen supera los 500 KB.')).toBeTruthy()

    await user.upload(logo, new File([PNG_BYTES], 'logo.png', { type: 'image/png' }))
    expect(screen.queryByText('La imagen supera los 500 KB.')).toBeNull()
    expect(await screen.findByRole('img', { name: 'Logo del INAC nuevo' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Guardar parámetros' }))

    expect(await screen.findByText('Parámetros guardados.')).toBeTruthy()
    const [upload] = calls(spy, 'PUT')
    expect(upload?.url.pathname).toBe('/api/settings/graphic-resources/logo_inac')
    expect(new Headers(upload?.init.headers).get('Content-Type')).toBe('image/png')
    expect(new Headers(upload?.init.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`)
    expect(within(section('Credencial')).getAllByText('PENDIENTE INAC')).toHaveLength(1)
    expect(currentLocation()).toBe('/parametros')
  })
})
