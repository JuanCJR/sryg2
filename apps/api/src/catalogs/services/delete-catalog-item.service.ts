import type { CatalogSlug } from '@sryg/types'
import { NotFoundError } from '../../common/errors/domain-errors'
import type { CatalogTransaction } from '../catalogs.types'
import type { Actor } from '../dtos/actor.dto'
import { CATALOG_ENTITIES } from './catalog-item'

/** Physically deletes an item nobody references; an item in use answers 409 and must be deactivated. */
export class DeleteCatalogItemService {
  constructor(private readonly transaction: CatalogTransaction) {}

  async execute(actor: Actor, catalog: CatalogSlug, id: string): Promise<void> {
    await this.transaction.run(async ({ items, audit }) => {
      const current = await items.findById(catalog, id)
      if (!current) throw new NotFoundError('Catalog item not found')
      await items.delete(catalog, id)
      await audit.record({
        actorId: actor.id,
        action: 'eliminar',
        entity: CATALOG_ENTITIES[catalog],
        entityId: id,
        changes: { before: current },
      })
    })
  }
}
