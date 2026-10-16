// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ATTACHMENT_MAX_BYTES, type AuthUser, type PersonnelAttachmentDto, type PersonnelDto } from '@sryg/types'
import { sessionStore } from '../../common/services/session'
import { chooseRowAction, rowActionLabels } from '../../test/row-actions'
import { mockApi, type MockHandler } from '../../test/api-mock'
import { TOKEN, renderApp, userWith } from '../../test/render-app'

const ID = '0b6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e11'
const TYPE = { id: '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b33', nameEs: 'Constancia ficticia', nameEn: null }

const PERSON: PersonnelDto = {
  id: ID,
  cedula: '00000101',
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
  hasPhoto: true,
  hasSignature: true,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-02T13:05:00.000Z',
}

const ATTACHMENT: PersonnelAttachmentDto = {
  id: '7a1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b44',
  personalId: ID,
  attachmentTypeId: TYPE.id,
  attachmentTypeName: TYPE.nameEs,
  filename: 'constancia.pdf',
  mime: 'application/pdf',
  size: 2560,
  createdAt: '2026-10-03T09:30:00.000Z',
}

const BASE = `/api/personnel/${ID}/attachments`

/** `attachments` returns the stored list, or null to make the list fail. */
function signIn(
  user: AuthUser,
  attachments: () => PersonnelAttachmentDto[] | null,
  api: MockHandler = () => undefined,
) {
  sessionStore.set(TOKEN)
  return mockApi((url, init) => {
    if (url.pathname === '/api/auth/me') return { status: 200, body: user }
    if (url.pathname === `/api/personnel/${ID}`) return { status: 200, body: PERSON }
    if (url.pathname === '/api/catalogs/attachment-types/options') return { status: 200, body: [TYPE] }
    if (url.pathname === BASE && (init.method ?? 'GET') === 'GET') {
      const list = attachments()
      return list ? { status: 200, body: list } : { status: 503, body: { message: 'x' } }
    }
    return api(url, init)
  })
}

const calls = (api: ReturnType<typeof mockApi>, method: string, path: string) =>
  api.mock.calls.filter(
    ([url, init]) => new URL(String(url)).pathname === path && (init?.method ?? 'GET').toUpperCase() === method,
  )

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:archivo')
  URL.revokeObjectURL = vi.fn()
  // jsdom does not implement modal dialogs.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.clear()
})

describe('Documentos page key of the Expediente (D21)', () => {
  it('lists the documents and attaches a new one with its catalog type', async () => {
    let stored: PersonnelAttachmentDto[] = []
    const api = signIn(
      userWith('supervisor', 'licencias'),
      () => stored,
      (url, init) => {
        if (url.pathname !== BASE || init.method !== 'POST') return undefined
        stored = [ATTACHMENT]
        return { status: 201, body: ATTACHMENT }
      },
    )
    const user = userEvent.setup()
    renderApp(`/personal/${ID}?pagina=documentos`)

    expect(await screen.findByText('Aún no hay documentos adjuntos')).toBeTruthy()
    await user.click(screen.getByLabelText('Tipo de documento adjunto'))
    await user.click(await screen.findByRole('option', { name: /Constancia ficticia/ }))
    const file = new File(['%PDF-1.4 ficticio'], 'constancia.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText('Archivo'), file)
    await user.click(screen.getByRole('button', { name: 'Adjuntar' }))

    const row = await screen.findByRole('row', { name: /constancia\.pdf/ })
    expect(within(row).getByText('Constancia ficticia')).toBeTruthy()
    expect(within(row).getByText('2,5 KB')).toBeTruthy()
    const [[, post]] = calls(api, 'POST', BASE)
    const form = post?.body as FormData
    expect(form.get('attachmentTypeId')).toBe(TYPE.id)
    expect(form.get('file')).toBe(file)
  })

  it('pages a long list of documents on the client, 10 at a time', async () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      ...ATTACHMENT,
      id: `7a1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b${String(index).padStart(2, '0')}`,
      filename: `documento-${index + 1}.pdf`,
    }))
    signIn(userWith('consulta', 'licencias'), () => many)
    const user = userEvent.setup()
    renderApp(`/personal/${ID}?pagina=documentos`)

    expect(await screen.findByRole('row', { name: /documento-1\.pdf/ })).toBeTruthy()
    expect(screen.getAllByRole('row')).toHaveLength(11) // header + 10
    const pagination = screen.getByRole('navigation', { name: 'Paginación' })
    expect(pagination.textContent).toContain('Mostrando 1–10 de 12')
    await user.click(within(pagination).getByRole('button', { name: 'Página 2' }))
    expect(screen.getByRole('row', { name: /documento-12\.pdf/ })).toBeTruthy()
    expect(screen.queryByRole('row', { name: /documento-1\.pdf/ })).toBeNull()
    expect(screen.getByRole('navigation', { name: 'Paginación' }).textContent).toContain('Mostrando 11–12 de 12')
  })

  it('checks the type and the 5 MB limit before uploading', async () => {
    const api = signIn(userWith('administrador', 'ambas'), () => [])
    const user = userEvent.setup({ applyAccept: false })
    renderApp(`/personal/${ID}?pagina=documentos`)

    await screen.findByText('Aún no hay documentos adjuntos')
    await user.click(screen.getByRole('button', { name: 'Adjuntar' }))
    expect(screen.getByText('Elija el tipo de documento.')).toBeTruthy()
    expect(screen.getByText('Elija un archivo PDF o una imagen.')).toBeTruthy()

    await user.upload(
      screen.getByLabelText('Archivo'),
      new File(['x'], 'hoja.xlsx', { type: 'application/vnd.ms-excel' }),
    )
    expect(screen.getByText('Solo se aceptan PDF, JPEG o PNG.')).toBeTruthy()
    const big = new File([new Uint8Array(ATTACHMENT_MAX_BYTES + 1)], 'grande.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText('Archivo'), big)
    expect(screen.getByText('El archivo supera los 5 MB.')).toBeTruthy()
    expect(calls(api, 'POST', BASE)).toHaveLength(0)
  })

  it('downloads and, after confirming, deletes a document', async () => {
    let stored = [ATTACHMENT]
    const api = signIn(
      userWith('supervisor', 'medicina'),
      () => stored,
      (url, init) => {
        if (url.pathname === `${BASE}/${ATTACHMENT.id}` && init.method === 'DELETE') {
          stored = []
          return { status: 204 }
        }
        if (url.pathname === `${BASE}/${ATTACHMENT.id}`) return { status: 200, body: 'pdf' }
        return undefined
      },
    )
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    renderApp(`/personal/${ID}?pagina=documentos`)

    const row = await screen.findByRole('row', { name: /constancia\.pdf/ })
    await chooseRowAction(user, within(row).getByRole('button', { name: 'Acciones de constancia.pdf' }), 'Descargar')
    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(calls(api, 'GET', `${BASE}/${ATTACHMENT.id}`)).toHaveLength(1)

    await chooseRowAction(user, within(row).getByRole('button', { name: 'Acciones de constancia.pdf' }), 'Eliminar')
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar documento' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Aún no hay documentos adjuntos')).toBeTruthy()
    expect(calls(api, 'DELETE', `${BASE}/${ATTACHMENT.id}`)).toHaveLength(1)
  })

  it('lets Consulta read and download but not attach or delete', async () => {
    signIn(userWith('consulta', 'ambas'), () => [ATTACHMENT])
    renderApp(`/personal/${ID}?pagina=documentos`)

    const row = await screen.findByRole('row', { name: /constancia\.pdf/ })
    expect(
      await rowActionLabels(userEvent.setup(), within(row).getByRole('button', { name: 'Acciones de constancia.pdf' })),
    ).toEqual(['Descargar'])
    expect(screen.queryByRole('button', { name: 'Adjuntar' })).toBeNull()
  })

  it('offers a retry when the list fails', async () => {
    let fail = true
    signIn(userWith('consulta', 'ambas'), () => (fail ? null : []))
    const user = userEvent.setup()
    renderApp(`/personal/${ID}?pagina=documentos`)

    expect(await screen.findByText('No se pudieron cargar los documentos')).toBeTruthy()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Aún no hay documentos adjuntos')).toBeTruthy()
  })
})

describe('Datos page key: photo and signature (D5)', () => {
  it('shows the stored photo and signature', async () => {
    const api = signIn(
      userWith('consulta', 'ambas'),
      () => [],
      (url) =>
        url.pathname.endsWith('/photo') || url.pathname.endsWith('/signature')
          ? { status: 200, body: 'img' }
          : undefined,
    )
    renderApp(`/personal/${ID}`)

    const panel = await screen.findByRole('tabpanel')
    expect((await within(panel).findByRole('img', { name: 'Foto del titular' })).getAttribute('src')).toBe(
      'blob:archivo',
    )
    expect(await within(panel).findByRole('img', { name: 'Firma del titular' })).toBeTruthy()
    expect(calls(api, 'GET', `/api/personnel/${ID}/photo`)).toHaveLength(1)
  })
})
