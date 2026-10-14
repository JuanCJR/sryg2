import { sessionStore } from '../session/session'
import { API_URL } from './config'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown
  readonly headers: Headers

  constructor(status: number, message: string, body: unknown, headers: Headers = new Headers()) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
    this.headers = headers
  }
}

export interface FetchJsonOptions extends Omit<RequestInit, 'body'> {
  /** Overrides the session token for this request. */
  token?: string
  body?: unknown
}

export interface FetchJsonSession {
  getToken: () => string | null
  /** Called on a 401 to a request that carried a token: the session expired or was revoked (D4). */
  onUnauthorized: () => void
}

export function createFetchJson(baseUrl: string | undefined, fetchImpl?: typeof fetch, session?: FetchJsonSession) {
  return async function fetchJson<T>(
    path: string,
    { token, body, headers, ...init }: FetchJsonOptions = {},
  ): Promise<T> {
    if (!baseUrl) throw new Error('API URL is not configured: set VITE_API_URL at build time.')
    const bearer = token ?? session?.getToken() ?? null
    const finalHeaders = new Headers(headers)
    finalHeaders.set('Accept', 'application/json')
    if (bearer) finalHeaders.set('Authorization', `Bearer ${bearer}`)
    if (body !== undefined) finalHeaders.set('Content-Type', 'application/json')
    const response = await (fetchImpl ?? globalThis.fetch)(`${baseUrl}${path}`, {
      ...init,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const payload: unknown = await response.json().catch(() => undefined)
    if (!response.ok) {
      // A 401 without a token is a rejected login, not an expired session.
      if (response.status === 401 && bearer) session?.onUnauthorized()
      const message = (payload as { message?: string } | undefined)?.message ?? response.statusText
      throw new ApiError(response.status, message, payload, response.headers)
    }
    return payload as T
  }
}

export type FetchJson = ReturnType<typeof createFetchJson>

/**
 * The app-wide client: sends the stored token and, on a 401, clears the session. The route gate
 * then sends the user to `/ingreso?next=<where they were>` (D4: no refresh token).
 */
export const fetchJson = createFetchJson(API_URL, undefined, {
  getToken: () => sessionStore.get(),
  onUnauthorized: () => sessionStore.clear(),
})
