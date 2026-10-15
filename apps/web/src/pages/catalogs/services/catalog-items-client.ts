import {
  catalogItemSchemaFor,
  type AnyCatalogItemCreateInput,
  type AnyCatalogItemDto,
  type AnyCatalogItemUpdateInput,
  type CatalogSlug,
  type Paginated,
} from '@sryg/types'
import { fetchJson as defaultFetchJson, type FetchJson } from '../../../common/services/fetch-json'

export interface CatalogItemsQuery {
  q?: string
  page: number
  pageSize: number
}

function parsePage(catalog: CatalogSlug, payload: unknown): Paginated<AnyCatalogItemDto> {
  const { items, page, pageSize, total } = (payload ?? {}) as Record<string, unknown>
  if (![page, pageSize, total].every(Number.isInteger)) throw new TypeError('Unexpected catalog page')
  return {
    items: catalogItemSchemaFor(catalog).array().parse(items),
    page: page as number,
    pageSize: pageSize as number,
    total: total as number,
  }
}

const itemPath = (catalog: CatalogSlug, id?: string) =>
  `/api/catalogs/${catalog}${id ? `/${encodeURIComponent(id)}` : ''}`

/** GET /api/catalogs/:catalog — every item, active or not, searched on both names. */
export async function listCatalogItems(
  catalog: CatalogSlug,
  { q, page, pageSize }: CatalogItemsQuery,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<Paginated<AnyCatalogItemDto>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (q) params.set('q', q)
  return parsePage(catalog, await fetchJson<unknown>(`${itemPath(catalog)}?${params.toString()}`))
}

/** POST /api/catalogs/:catalog (Admin). */
export async function createCatalogItem(
  catalog: CatalogSlug,
  body: AnyCatalogItemCreateInput,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<AnyCatalogItemDto> {
  return catalogItemSchemaFor(catalog).parse(await fetchJson<unknown>(itemPath(catalog), { method: 'POST', body }))
}

/** PATCH /api/catalogs/:catalog/:id (Admin); `{ active }` activates or deactivates. */
export async function updateCatalogItem(
  catalog: CatalogSlug,
  id: string,
  body: AnyCatalogItemUpdateInput,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<AnyCatalogItemDto> {
  return catalogItemSchemaFor(catalog).parse(await fetchJson<unknown>(itemPath(catalog, id), { method: 'PATCH', body }))
}

/** DELETE /api/catalogs/:catalog/:id (Admin). 409 when the item is in use. */
export async function deleteCatalogItem(
  catalog: CatalogSlug,
  id: string,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<void> {
  await fetchJson<unknown>(itemPath(catalog, id), { method: 'DELETE' })
}
