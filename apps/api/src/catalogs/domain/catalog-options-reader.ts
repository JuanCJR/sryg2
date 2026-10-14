import type { CatalogOption, CatalogOptionsQuery, CatalogSlug } from '@sryg/types'

/** Active items of a D19 catalog for selectors, sorted by Spanish name. */
export interface CatalogOptionsReader {
  options(catalog: CatalogSlug, query: CatalogOptionsQuery): Promise<CatalogOption[]>
}
