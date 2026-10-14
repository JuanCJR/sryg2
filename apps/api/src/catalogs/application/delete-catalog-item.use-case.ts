import type { CatalogSlug } from '@sryg/types'
import { NotFoundError } from '../../shared/domain/errors'
import { CATALOG_ENTITIES } from '../domain/catalog-item'
import type { CatalogUnitOfWork } from '../domain/catalog-unit-of-work'
import type { Actor } from './actor'

/** Physically deletes an item nobody references; an item in use answers 409 and must be deactivated. */
export class DeleteCatalogItemUseCase {
  constructor(private readonly uow: CatalogUnitOfWork) {}

  async execute(actor: Actor, catalog: CatalogSlug, id: string): Promise<void> {
    await this.uow.run(async ({ items, audit }) => {
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
