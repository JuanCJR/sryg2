import type { CatalogListQuery, CatalogSlug, Paginated } from '@sryg/types'
import type { CatalogItem } from '../domain/catalog-item'
import type { CatalogItemRepository } from '../domain/catalog-item-repository'

export class ListCatalogItemsUseCase {
  constructor(private readonly items: CatalogItemRepository) {}

  execute(catalog: CatalogSlug, query: CatalogListQuery): Promise<Paginated<CatalogItem>> {
    return this.items.list(catalog, query)
  }
}
