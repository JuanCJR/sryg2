import { vi } from 'vitest'

export type MockHandler = (url: URL, init: RequestInit) => { status: number; body?: unknown } | undefined

/**
 * Replaces `fetch` with a router over fictitious API responses. Unmatched requests answer 404 so a
 * test never reaches the network. Returns the spy to assert on requests.
 */
export function mockApi(handler: MockHandler) {
  const spy = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const reply = handler(url, init) ?? { status: 404, body: { statusCode: 404, error: 'Not Found', message: 'x' } }
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
      status: reply.status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', spy)
  return spy
}

export function authorizationOf(init: RequestInit | undefined): string | null {
  return new Headers(init?.headers).get('Authorization')
}
