import { loginResponseSchema, type LoginRequest, type LoginResponse } from '@sryg/types'
import { ApiError, fetchJson as defaultFetchJson } from '../../../common/services/fetch-json'

export type LoginOutcome =
  | { kind: 'success'; response: LoginResponse }
  | { kind: 'invalid' }
  | { kind: 'throttled'; retryAfterSeconds?: number }
  | { kind: 'validation' }
  | { kind: 'unreachable' }

type FetchJson = <T>(path: string, options?: { method?: string; body?: unknown }) => Promise<T>

function parseRetryAfter(headers: Headers): number | undefined {
  const raw = headers.get('Retry-After')?.trim()
  if (!raw || !/^\d+$/.test(raw)) return undefined
  const seconds = Number(raw)
  return seconds > 0 ? seconds : undefined
}

function mapError(error: unknown): LoginOutcome {
  if (error instanceof ApiError) {
    if (error.status === 401) return { kind: 'invalid' }
    if (error.status === 400) return { kind: 'validation' }
    if (error.status === 429) {
      const retryAfterSeconds = parseRetryAfter(error.headers)
      return retryAfterSeconds === undefined ? { kind: 'throttled' } : { kind: 'throttled', retryAfterSeconds }
    }
  }
  // Network failure, 5xx, unexpected status or missing API URL: the server cannot be reached for this purpose.
  return { kind: 'unreachable' }
}

/** Returns a login function that never throws: every failure is mapped to a typed outcome. */
export function createLoginClient(fetchJson: FetchJson) {
  return async function login(credentials: LoginRequest): Promise<LoginOutcome> {
    try {
      const body = { email: credentials.email.trim(), password: credentials.password }
      const payload = await fetchJson<unknown>('/api/auth/login', { method: 'POST', body })
      const parsed = loginResponseSchema.safeParse(payload)
      return parsed.success ? { kind: 'success', response: parsed.data } : { kind: 'unreachable' }
    } catch (error) {
      return mapError(error)
    }
  }
}

export const login = createLoginClient(defaultFetchJson)
