import { CATALOGS, type CatalogSlug } from '@sryg/types'
import { NotFoundError } from '../../shared/domain/errors'

/** An unknown catalog answers 404, like the options endpoint. */
export function toCatalogSlug(catalog: string): CatalogSlug {
  if (!(CATALOGS as readonly string[]).includes(catalog)) throw new NotFoundError('Catalog not found')
  return catalog as CatalogSlug
}
