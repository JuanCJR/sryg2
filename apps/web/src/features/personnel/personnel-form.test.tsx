// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AuthUser, PersonnelDto } from '@sryg/types'
import { sessionStore } from '../../shared/session/session'
import { mockApi, type MockHandler } from '../../test/api-mock'
import { TOKEN, currentLocation, renderApp, userWith } from '../../test/render-app'

const ID = '0b6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e11'
const DOC_TYPE = { id: '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b11', nameEs: 'Cédula de identidad', nameEn: 'ID card' }
const NATIONALITY = { id: '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b22', nameEs: 'Venezolana', nameEn: 'Venezuelan' }

const PERSON: PersonnelDto = {
  id: ID,
  cedula: '00000101',
  firstNames: 'Persona',
  lastNames: 'De Prueba Uno',
  documentTypeId: DOC_TYPE.id,
  nationalityId: NATIONALITY.id,
  birthDate: '1990-04-02',
  address: 'Dirección ficticia 1',
  email: 'persona.prueba@sryg.test',
  phone: null,
  bloodType: 'o_pos',
  cargo: 'Piloto',
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
  return mockApi((url, init) => {
    if (url.pathname === '/api/auth/me') return { status: 200, body: user }
    if (url.pathname === '/api/catalogs/document-types/options') return { status: 200, body: [DOC_TYPE] }
    if (url.pathname === '/api/catalogs/nationalities/options') return { status: 200, body: [NATIONALITY] }
    return api(url, init)
  })
}

const calls = (api: ReturnType<typeof mockApi>, method: string, path: string) =>
  api.mock.calls.filter(
    ([url, init]) => new URL(String(url)).pathname === path && (init?.method ?? 'GET').toUpperCase() === method,
  )
const jsonBody = (init: RequestInit | undefined) => JSON.parse(String(init?.body)) as Record<string, unknown>

beforeEach(() => {
  // jsdom has no object URLs; the previews only need a string.
  URL.createObjectURL = vi.fn(() => 'blob:vista-previa')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.clear()
})

async function pick(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  await user.click(screen.getByLabelText(label))
  await user.click(await screen.findByRole('option', { name: new RegExp(option) }))
}

describe('Registro de personal (/personal/nuevo)', () => {
  it('creates the person with catalog ids, uploads the photo shown in the preview and opens the Expediente', async () => {
    const api = signIn(userWith('supervisor', 'licencias'), (url, init) => {
      if (url.pathname === '/api/personnel' && init.method === 'POST') return { status: 201, body: PERSON }
      if (url.pathname === `/api/personnel/${ID}/photo` && init.method === 'PUT')
        return { status: 200, body: { ...PERSON, hasPhoto: true } }
      if (url.pathname === `/api/personnel/${ID}`) return { status: 200, body: PERSON }
      return undefined
    })
    const user = userEvent.setup()
    renderApp('/personal/nuevo')

    expect(await screen.findByRole('heading', { name: 'Registro de personal', level: 1 })).toBeTruthy()
    await pick(user, 'Tipo de documento', 'Cédula de identidad')
    await user.type(screen.getByLabelText(/Número de documento/), 'V-00.000.101')
    await user.type(screen.getByLabelText(/^Nombres/), 'Persona')
    await user.type(screen.getByLabelText(/^Apellidos/), 'De Prueba Uno')
    await pick(user, 'Nacionalidad', 'Venezolana')
    await user.type(screen.getByLabelText('Fecha de nacimiento'), '02041990')
    await user.selectOptions(screen.getByLabelText('Categoría'), 'piloto_comercial')

    const photo = new File(['foto ficticia'], 'foto.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('Foto'), photo)
    expect(screen.getByRole('img', { name: 'Vista previa de la foto' }).getAttribute('src')).toBe('blob:vista-previa')

    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(currentLocation()).toBe(`/personal/${ID}`))
    const [[, post]] = calls(api, 'POST', '/api/personnel')
    expect(jsonBody(post)).toEqual({
      cedula: 'V-00.000.101',
      firstNames: 'Persona',
      lastNames: 'De Prueba Uno',
      documentTypeId: DOC_TYPE.id,
      nationalityId: NATIONALITY.id,
      birthDate: '1990-04-02',
      category: 'piloto_comercial',
    })
    const [[, put]] = calls(api, 'PUT', `/api/personnel/${ID}/photo`)
    expect((put?.body as FormData).get('file')).toBe(photo)
    expect(new Headers(put?.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`)
    expect(calls(api, 'PUT', `/api/personnel/${ID}/signature`)).toHaveLength(0)
  })

  it('marks the required fields and sends nothing while they are missing or invalid', async () => {
    const api = signIn(userWith('administrador', 'ambas'), () => undefined)
    const user = userEvent.setup()
    renderApp('/personal/nuevo')

    await user.type(await screen.findByLabelText('Correo electrónico'), 'no-es-correo')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText('Revise los campos marcados')).toBeTruthy()
    expect(screen.getByText('Ingrese un número de documento de 6 a 9 dígitos.')).toBeTruthy()
    expect(screen.getByText('Ingrese los nombres.')).toBeTruthy()
    expect(screen.getByText('Ingrese los apellidos.')).toBeTruthy()
    expect(screen.getByText('Ingrese un correo válido.')).toBeTruthy()
    expect(calls(api, 'POST', '/api/personnel')).toHaveLength(0)
  })

  it('refuses a photo that is not an image before uploading anything', async () => {
    signIn(userWith('administrador', 'ambas'), () => undefined)
    const user = userEvent.setup({ applyAccept: false })
    renderApp('/personal/nuevo')

    await user.upload(
      await screen.findByLabelText('Firma'),
      new File(['%PDF'], 'firma.pdf', { type: 'application/pdf' }),
    )
    expect(screen.getByText('Use una imagen JPEG, PNG o WebP.')).toBeTruthy()
    expect(screen.queryByRole('img', { name: 'Vista previa de la firma' })).toBeNull()
  })

  it('shows a taken document number next to its field (409)', async () => {
    signIn(userWith('supervisor', 'medicina'), (url, init) =>
      url.pathname === '/api/personnel' && init.method === 'POST'
        ? { status: 409, body: { statusCode: 409, error: 'Conflict', message: 'x' } }
        : undefined,
    )
    const user = userEvent.setup()
    renderApp('/personal/nuevo')

    await user.type(await screen.findByLabelText(/Número de documento/), '00000101')
    await user.type(screen.getByLabelText(/^Nombres/), 'Persona')
    await user.type(screen.getByLabelText(/^Apellidos/), 'Repetida')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText('Ya existe una persona con este número de documento.')).toBeTruthy()
    expect(currentLocation()).toBe('/personal/nuevo')
  })
})

describe('Editar datos (/personal/:id/editar)', () => {
  it('loads the record with its catalog names and sends only what changed', async () => {
    const api = signIn(userWith('supervisor', 'licencias'), (url, init) => {
      if (url.pathname === `/api/personnel/${ID}` && init.method === 'PATCH')
        return { status: 200, body: { ...PERSON, cargo: 'Capitán' } }
      if (url.pathname === `/api/personnel/${ID}`) return { status: 200, body: PERSON }
      return undefined
    })
    const user = userEvent.setup()
    renderApp(`/personal/${ID}/editar`)

    const cargo = await screen.findByLabelText('Cargo')
    expect((screen.getByLabelText(/^Nombres/) as HTMLInputElement).value).toBe('Persona')
    await waitFor(() =>
      expect((screen.getByLabelText('Tipo de documento') as HTMLInputElement).value).toBe('Cédula de identidad'),
    )
    expect((screen.getByLabelText('Nacionalidad') as HTMLInputElement).value).toBe('Venezolana')
    expect((screen.getByLabelText('Fecha de nacimiento') as HTMLInputElement).value).toBe('02/04/1990')

    await user.clear(cargo)
    await user.type(cargo, 'Capitán')
    await user.clear(screen.getByLabelText('Dirección'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(currentLocation()).toBe(`/personal/${ID}`))
    const [[, patch]] = calls(api, 'PATCH', `/api/personnel/${ID}`)
    expect(jsonBody(patch)).toEqual({ cargo: 'Capitán', address: null })
  })

  it('answers 404 for an unknown person', async () => {
    signIn(userWith('supervisor', 'licencias'), () => undefined)
    renderApp(`/personal/${ID}/editar`)
    expect(await screen.findByRole('heading', { name: 'Persona no encontrada' })).toBeTruthy()
  })

  it('is reached from the Expediente through "Editar datos", which Consulta does not see', async () => {
    const api: MockHandler = (url) =>
      url.pathname === `/api/personnel/${ID}` ? { status: 200, body: { ...PERSON, hasPhoto: true } } : undefined
    signIn(userWith('supervisor', 'medicina'), api)
    const user = userEvent.setup()
    const { unmount } = renderApp(`/personal/${ID}`)

    const header = await screen.findByRole('heading', { name: '00000101', level: 1 })
    expect(header).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Editar datos' }))
    await waitFor(() => expect(currentLocation()).toBe(`/personal/${ID}/editar`))
    unmount()

    signIn(userWith('consulta', 'ambas'), api)
    renderApp(`/personal/${ID}`)
    const panel = await screen.findByRole('tabpanel')
    expect(within(panel).getByText('De Prueba Uno')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Editar datos' })).toBeNull()
  })
})
