import { CATALOGS, type CatalogOption, type CatalogOptionsQuery, type CatalogSlug } from '@sryg/types'
import { NotFoundError } from '../../shared/domain/errors'
import type { CatalogOptionsReader } from '../domain/catalog-options-reader'

export class ListCatalogOptionsUseCase {
  constructor(private readonly reader: CatalogOptionsReader) {}

  execute(catalog: string, query: CatalogOptionsQuery): Promise<CatalogOption[]> {
    if (!(CATALOGS as readonly string[]).includes(catalog)) throw new NotFoundError('Catalog not found')
    return this.reader.options(catalog as CatalogSlug, query)
  }
}
