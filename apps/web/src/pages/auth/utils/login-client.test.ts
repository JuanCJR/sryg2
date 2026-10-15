import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../common/services/fetch-json'
import { createLoginClient } from './login-client'

const credentials = { email: 'ana@inac.gob.ve', password: 'secret' }
const okBody = {
  accessToken: 'tok',
  expiresIn: 900,
  user: {
    id: '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b11',
    email: 'ana@inac.gob.ve',
    fullName: 'Ana',
    role: 'administrador',
    area: 'ambas',
    mustChangePassword: false,
  },
}

const apiError = (status: number, retryAfter?: string) =>
  new ApiError(status, 'x', undefined, new Headers(retryAfter ? { 'Retry-After': retryAfter } : {}))

describe('createLoginClient', () => {
  it('posts the credentials to /api/auth/login and returns the parsed session', async () => {
    const fetchJson = vi.fn().mockResolvedValue(okBody)
    const result = await createLoginClient(fetchJson)(credentials)
    expect(fetchJson).toHaveBeenCalledWith('/api/auth/login', { method: 'POST', body: credentials })
    expect(result).toEqual({ kind: 'success', response: okBody })
  })

  it('trims the email before sending it', async () => {
    const fetchJson = vi.fn().mockResolvedValue(okBody)
    await createLoginClient(fetchJson)({ email: '  ana@inac.gob.ve ', password: 'secret' })
    expect(fetchJson.mock.calls[0][1].body).toEqual(credentials)
  })

  it('maps 401 to invalid credentials', async () => {
    const result = await createLoginClient(vi.fn().mockRejectedValue(apiError(401)))(credentials)
    expect(result).toEqual({ kind: 'invalid' })
  })

  it('maps 429 to throttled, carrying Retry-After seconds when present', async () => {
    const withHeader = await createLoginClient(vi.fn().mockRejectedValue(apiError(429, '42')))(credentials)
    expect(withHeader).toEqual({ kind: 'throttled', retryAfterSeconds: 42 })
    const without = await createLoginClient(vi.fn().mockRejectedValue(apiError(429)))(credentials)
    expect(without).toEqual({ kind: 'throttled' })
    const junk = await createLoginClient(vi.fn().mockRejectedValue(apiError(429, 'soon')))(credentials)
    expect(junk).toEqual({ kind: 'throttled' })
  })

  it('maps 400 to validation', async () => {
    const result = await createLoginClient(vi.fn().mockRejectedValue(apiError(400)))(credentials)
    expect(result).toEqual({ kind: 'validation' })
  })

  it('maps network failures, 5xx and a missing API URL to unreachable', async () => {
    expect(await createLoginClient(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))(credentials)).toEqual({
      kind: 'unreachable',
    })
    expect(await createLoginClient(vi.fn().mockRejectedValue(apiError(503)))(credentials)).toEqual({
      kind: 'unreachable',
    })
    expect(
      await createLoginClient(vi.fn().mockRejectedValue(new Error('API URL is not configured')))(credentials),
    ).toEqual({
      kind: 'unreachable',
    })
  })

  it('treats a 200 with an unexpected body as unreachable', async () => {
    const result = await createLoginClient(vi.fn().mockResolvedValue({ nope: true }))(credentials)
    expect(result).toEqual({ kind: 'unreachable' })
  })
})
