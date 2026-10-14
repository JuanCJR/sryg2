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
  token?: string
  body?: unknown
}

export function createFetchJson(baseUrl: string | undefined, fetchImpl: typeof fetch = fetch) {
  return async function fetchJson<T>(
    path: string,
    { token, body, headers, ...init }: FetchJsonOptions = {},
  ): Promise<T> {
    if (!baseUrl) throw new Error('API URL is not configured: set VITE_API_URL at build time.')
    const finalHeaders = new Headers(headers)
    finalHeaders.set('Accept', 'application/json')
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`)
    if (body !== undefined) finalHeaders.set('Content-Type', 'application/json')
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const payload: unknown = await response.json().catch(() => undefined)
    if (!response.ok) {
      const message = (payload as { message?: string } | undefined)?.message ?? response.statusText
      throw new ApiError(response.status, message, payload, response.headers)
    }
    return payload as T
  }
}

export const fetchJson = createFetchJson(API_URL)
