// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AccessLog, AuthUser } from '@sryg/types'
import { sessionStore } from '../../common/services/session'
import { mockApi, type MockHandler } from '../../test/api-mock'
import { TOKEN, renderApp, userWith } from '../../test/render-app'

const LOG: AccessLog = {
  successful: [
    { at: '2026-10-13T16:05:00.000Z', ip: '198.51.100.7' },
    { at: '2026-10-12T13:00:00.000Z', ip: null },
  ],
  failed: [{ at: '2026-10-11T02:30:00.000Z', ip: '203.0.113.9' }],
}

/** Answers /me with `user` (a function, so a test can flip it after a password change). */
function signIn(user: () => AuthUser, api: MockHandler = () => undefined) {
  sessionStore.set(TOKEN)
  return mockApi((url, init) => {
    if (url.pathname === '/api/auth/me') return { status: 200, body: user() }
    if (url.pathname === '/api/auth/me/access-log') return api(url, init) ?? { status: 200, body: LOG }
    return api(url, init)
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.clear()
})

async function fillPasswords(current: string, next: string, confirm = next) {
  const user = userEvent.setup()
  const fields: Array<[string, string]> = [
    ['Contraseña actual', current],
    ['Nueva contraseña', next],
    ['Confirmar nueva contraseña', confirm],
  ]
  for (const [label, value] of fields) {
    const input = await screen.findByLabelText(label)
    await user.clear(input)
    if (value) await user.type(input, value)
  }
  await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
}

describe('Perfil (AUTH-08, D4, D23)', () => {
  it('shows the account data and the access log, with local date, time and IP', async () => {
    signIn(() => userWith('supervisor', 'medicina'))
    renderApp('/perfil')

    expect(await screen.findByRole('heading', { name: 'Perfil' })).toBeTruthy()
    const account = screen.getByRole('group', { name: 'Cuenta' })
    expect(within(account).getByText('usuario.prueba@sryg.test')).toBeTruthy()
    expect(within(account).getByText('Supervisor')).toBeTruthy()
    expect(within(account).getByText('Medicina')).toBeTruthy()

    const accesses = await screen.findByRole('list', { name: 'Últimos accesos' })
    const rows = within(accesses).getAllByRole('listitem')
    // 16:05 UTC is 12:05 in Venezuela.
    expect(rows[0]?.textContent).toContain('13/10/2026')
    expect(rows[0]?.textContent).toContain('12:05')
    expect(rows[0]?.textContent).toContain('198.51.100.7')
    expect(rows[1]?.textContent).toContain('IP desconocida')
    const failed = screen.getByRole('list', { name: 'Intentos fallidos' })
    expect(within(failed).getAllByRole('listitem')).toHaveLength(1)
    expect(failed.textContent).toContain('10/10/2026')
    expect(failed.textContent).toContain('22:30')
  })

  it('says so when there are no failed attempts', async () => {
    signIn(
      () => userWith('consulta', 'licencias'),
      (url) =>
        url.pathname === '/api/auth/me/access-log'
          ? { status: 200, body: { successful: LOG.successful, failed: [] } }
          : undefined,
    )
    renderApp('/perfil')
    expect(await screen.findByText('No hay intentos fallidos registrados.')).toBeTruthy()
  })

  it('validates the new password on the client (D4: at least 10 characters, confirmed)', async () => {
    const api = signIn(() => userWith('consulta', 'licencias'))
    renderApp('/perfil')

    await fillPasswords('actual', 'corta')
    expect(await screen.findByText('Use al menos 10 caracteres.')).toBeTruthy()
    await fillPasswords('', 'una-clave-larga', 'otra-clave-larga')
    expect(await screen.findByText('Escriba su contraseña actual.')).toBeTruthy()
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy()
    expect(api.mock.calls.some(([url]) => String(url).includes('change-password'))).toBe(false)
  })

  it('shows a wrong current password on its field, without signing out', async () => {
    signIn(
      () => userWith('consulta', 'licencias'),
      (url) =>
        url.pathname === '/api/auth/change-password'
          ? { status: 403, body: { statusCode: 403, error: 'Forbidden', message: 'x' } }
          : undefined,
    )
    renderApp('/perfil')
    await fillPasswords('no-es-esta', 'una-clave-larga')
    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeTruthy()
    expect(sessionStore.get()).toBe(TOKEN)
  })

  it('forces the change after a reset and releases the user once it is done', async () => {
    let mustChange = true
    const api = signIn(
      () => userWith('supervisor', 'licencias', { mustChangePassword: mustChange }),
      (url, init) => {
        if (url.pathname !== '/api/auth/change-password') return undefined
        expect(JSON.parse(String(init.body))).toEqual({
          currentPassword: 'temporal-123',
          newPassword: 'mi-clave-nueva',
        })
        mustChange = false
        return { status: 204 }
      },
    )
    renderApp('/personal')

    expect(await screen.findByText('Debe cambiar su contraseña')).toBeTruthy()
    await fillPasswords('temporal-123', 'mi-clave-nueva')

    expect(await screen.findByText('Contraseña actualizada.')).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('Debe cambiar su contraseña')).toBeNull())
    const changeCall = api.mock.calls.find(([url]) => String(url).endsWith('/api/auth/change-password'))
    expect(new Headers(changeCall?.[1]?.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`)
  })
})
