import type { CatalogListQuery, CatalogSlug, Paginated } from '@sryg/types'
import type { CatalogItem, CatalogItemChanges, NewCatalogItem } from './catalog-item'

export interface CatalogItemRepository {
  findById(catalog: CatalogSlug, id: string): Promise<CatalogItem | null>
  /** Every item, active or not, sorted by Spanish name. */
  list(catalog: CatalogSlug, query: CatalogListQuery): Promise<Paginated<CatalogItem>>
  /** Throws ConflictError when the Spanish name already exists (case-insensitive). */
  create(catalog: CatalogSlug, data: NewCatalogItem): Promise<CatalogItem>
  /** Throws NotFoundError for an unknown id and ConflictError when the new Spanish name already exists. */
  update(catalog: CatalogSlug, id: string, changes: CatalogItemChanges): Promise<CatalogItem>
  /** Throws ConflictError when another record references the item: items in use are only deactivated. */
  delete(catalog: CatalogSlug, id: string): Promise<void>
}
