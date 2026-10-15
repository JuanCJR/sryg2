import { accessLogSchema, type AccessLog, type ChangePasswordInput } from '@sryg/types'
import { fetchJson as defaultFetchJson, type FetchJson } from '../../../common/services/fetch-json'

/** POST /api/auth/change-password (AUTH-08). A wrong current password answers 403. */
export async function changePassword(input: ChangePasswordInput, fetchJson: FetchJson = defaultFetchJson) {
  await fetchJson<unknown>('/api/auth/change-password', { method: 'POST', body: input })
}

/** GET /api/auth/me/access-log (D23). */
export async function getAccessLog(fetchJson: FetchJson = defaultFetchJson): Promise<AccessLog> {
  return accessLogSchema.parse(await fetchJson<unknown>('/api/auth/me/access-log'))
}
