import { personnelSchema, type Paginated, type PersonnelDto } from '@sryg/types'
import { fetchJson as defaultFetchJson, type FetchJson } from '../../../shared/api/fetch-json'

const itemsSchema = personnelSchema.array()

function parsePage(payload: unknown): Paginated<PersonnelDto> {
  const { items, page, pageSize, total } = (payload ?? {}) as Record<string, unknown>
  if (![page, pageSize, total].every(Number.isInteger)) throw new TypeError('Unexpected personnel page')
  return { items: itemsSchema.parse(items), page: page as number, pageSize: pageSize as number, total: total as number }
}

export interface PersonnelListQuery {
  q?: string
  page: number
  pageSize: number
}

/** GET /api/personnel — search by name or cédula, paginated on the server. */
export async function listPersonnel(
  { q, page, pageSize }: PersonnelListQuery,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<Paginated<PersonnelDto>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (q) params.set('q', q)
  return parsePage(await fetchJson<unknown>(`/api/personnel?${params.toString()}`))
}

/** GET /api/personnel/:id */
export async function getPersonnel(id: string, fetchJson: FetchJson = defaultFetchJson): Promise<PersonnelDto> {
  return personnelSchema.parse(await fetchJson<unknown>(`/api/personnel/${encodeURIComponent(id)}`))
}
