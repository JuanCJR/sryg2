import {
  type CreateUserInput,
  type ManagedUser,
  managedUserSchema,
  type Paginated,
  type UpdateUserInput,
  type UserCredentialsResponse,
  userCredentialsResponseSchema,
} from '@sryg/types'
import { fetchJson as defaultFetchJson, type FetchJson } from '../../../common/services/fetch-json'

const itemsSchema = managedUserSchema.array()

function parsePage(payload: unknown): Paginated<ManagedUser> {
  const { items, page, pageSize, total } = (payload ?? {}) as Record<string, unknown>
  if (![page, pageSize, total].every(Number.isInteger)) throw new TypeError('Unexpected users page')
  return { items: itemsSchema.parse(items), page: page as number, pageSize: pageSize as number, total: total as number }
}

const userPath = (id: string, action = '') => `/api/users/${encodeURIComponent(id)}${action}`

/** GET /api/users — search by name or email, paginated on the server. */
export async function listUsers(
  { q, page, pageSize }: { q?: string; page: number; pageSize: number },
  fetchJson: FetchJson = defaultFetchJson,
): Promise<Paginated<ManagedUser>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (q) params.set('q', q)
  return parsePage(await fetchJson<unknown>(`/api/users?${params.toString()}`))
}

/** POST /api/users: answers the temporary password once (D14). 409 = email in use. */
export async function createUser(
  input: CreateUserInput,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<UserCredentialsResponse> {
  return userCredentialsResponseSchema.parse(await fetchJson<unknown>('/api/users', { method: 'POST', body: input }))
}

/** PATCH /api/users/:id. 409 = it would demote the last active Admin. */
export async function updateUser(
  id: string,
  input: UpdateUserInput,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<ManagedUser> {
  return managedUserSchema.parse(await fetchJson<unknown>(userPath(id), { method: 'PATCH', body: input }))
}

/** POST /api/users/:id/activate | deactivate. 409 = it would deactivate the last active Admin. */
export async function setUserActive(
  id: string,
  active: boolean,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<ManagedUser> {
  const action = active ? '/activate' : '/deactivate'
  return managedUserSchema.parse(await fetchJson<unknown>(userPath(id, action), { method: 'POST' }))
}

/** POST /api/users/:id/reset-password: answers the temporary password once (D4, D14). */
export async function resetUserPassword(
  id: string,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<UserCredentialsResponse> {
  return userCredentialsResponseSchema.parse(
    await fetchJson<unknown>(userPath(id, '/reset-password'), { method: 'POST' }),
  )
}
