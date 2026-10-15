import { authUserSchema, type AuthUser } from '@sryg/types'
import { fetchJson as defaultFetchJson, type FetchJson } from './fetch-json'

/** The signed-in user, from `/api/auth/me` (D12: the role comes from the API, never from the URL). */
export async function fetchCurrentUser(fetchJson: FetchJson = defaultFetchJson): Promise<AuthUser> {
  return authUserSchema.parse(await fetchJson<unknown>('/api/auth/me'))
}
