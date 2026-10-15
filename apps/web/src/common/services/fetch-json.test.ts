import { describe, expect, it, vi } from 'vitest'
import { ApiError, createFetchJson } from './fetch-json'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('createFetchJson', () => {
  it('fails clearly when the API URL is not configured', async () => {
    const fetchJson = createFetchJson(undefined, vi.fn())
    await expect(fetchJson('/x')).rejects.toThrow(/VITE_API_URL/)
  })

  it('requests base + path with the bearer token and parses JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(200, { ok: true }))
    const fetchJson = createFetchJson('https://api.test', fetchImpl)
    await expect(fetchJson('/api/me', { token: 't' })).resolves.toEqual({ ok: true })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.test/api/me')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer t')
  })

  it('throws ApiError with the parsed error body on non-2xx', async () => {
    const body = { statusCode: 409, error: 'Conflict', message: 'duplicate' }
    const fetchJson = createFetchJson('https://api.test', vi.fn().mockResolvedValue(json(409, body)))
    const err = await fetchJson('/api/p').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 409, message: 'duplicate', body })
  })
})

describe('ApiError headers', () => {
  it('exposes the response headers (e.g. Retry-After) on non-2xx', async () => {
    const response = new Response('{}', { status: 429, headers: { 'Retry-After': '30' } })
    const fetchJson = createFetchJson('https://api.test', vi.fn().mockResolvedValue(response))
    const err = (await fetchJson('/api/auth/login').catch((e: unknown) => e)) as ApiError
    expect(err.headers.get('Retry-After')).toBe('30')
  })
})

describe('createFetchJson session (D4)', () => {
  const session = (token: string | null) => ({ getToken: () => token, onUnauthorized: vi.fn() })

  it('sends the stored session token as Bearer when no explicit token is given', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(200, {}))
    await createFetchJson('https://api.test', fetchImpl, session('stored'))('/api/personnel')
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer stored')
  })

  it('reports a 401 on an authenticated request so the session can be cleared', async () => {
    const auth = session('expired')
    const fetchImpl = vi.fn().mockResolvedValue(json(401, { statusCode: 401, error: 'Unauthorized', message: 'x' }))
    await expect(createFetchJson('https://api.test', fetchImpl, auth)('/api/auth/me')).rejects.toMatchObject({
      status: 401,
    })
    expect(auth.onUnauthorized).toHaveBeenCalledOnce()
  })

  it('does not treat a 401 without a session (a rejected login) as an expired session', async () => {
    const auth = session(null)
    const fetchImpl = vi.fn().mockResolvedValue(json(401, { statusCode: 401, error: 'Unauthorized', message: 'x' }))
    await expect(createFetchJson('https://api.test', fetchImpl, auth)('/api/auth/login')).rejects.toBeInstanceOf(
      ApiError,
    )
    expect(auth.onUnauthorized).not.toHaveBeenCalled()
  })

  it('looks fetch up at call time when none is injected (tests and polyfills can replace it)', async () => {
    const stub = vi.fn().mockResolvedValue(json(200, { late: true }))
    vi.stubGlobal('fetch', stub)
    try {
      await expect(createFetchJson('https://api.test')('/x')).resolves.toEqual({ late: true })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
