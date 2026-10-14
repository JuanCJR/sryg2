import { catalogOptionSchema, type CatalogOption, type CatalogSlug } from '@sryg/types'
import { fetchJson as defaultFetchJson, type FetchJson } from '../../../shared/api/fetch-json'

const optionsSchema = catalogOptionSchema.array()

/** GET /api/catalogs/:catalog/options — active items only (D19), matching `q`. */
export async function fetchCatalogOptions(
  catalog: CatalogSlug,
  { q, limit }: { q?: string; limit: number },
  fetchJson: FetchJson = defaultFetchJson,
): Promise<CatalogOption[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (q) params.set('q', q)
  return optionsSchema.parse(await fetchJson<unknown>(`/api/catalogs/${catalog}/options?${params.toString()}`))
}
