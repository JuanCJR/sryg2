import { CATALOGS, type CatalogOption, type CatalogOptionsQuery, type CatalogSlug } from '@sryg/types'
import { NotFoundError } from '../../common/errors/domain-errors'
import type { CatalogOptionsRepository } from '../repositories/catalog-options.repository'

export class ListCatalogOptionsService {
  constructor(private readonly reader: CatalogOptionsRepository) {}

  execute(catalog: string, query: CatalogOptionsQuery): Promise<CatalogOption[]> {
    if (!(CATALOGS as readonly string[]).includes(catalog)) throw new NotFoundError('Catalog not found')
    return this.reader.options(catalog as CatalogSlug, query)
  }
}
