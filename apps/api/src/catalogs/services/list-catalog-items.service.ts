import type { CatalogListQuery, CatalogSlug, Paginated } from '@sryg/types'
import type { CatalogItemRepository } from '../repositories/catalog-item.repository'
import type { CatalogItem } from './catalog-item'

export class ListCatalogItemsService {
  constructor(private readonly items: CatalogItemRepository) {}

  execute(catalog: CatalogSlug, query: CatalogListQuery): Promise<Paginated<CatalogItem>> {
    return this.items.list(catalog, query)
  }
}
