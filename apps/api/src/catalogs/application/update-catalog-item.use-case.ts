import type { AnyCatalogItemUpdateInput, CatalogSlug } from '@sryg/types'
import { NotFoundError } from '../../shared/domain/errors'
import { CATALOG_ENTITIES, type CatalogItem, type CatalogItemChanges } from '../domain/catalog-item'
import type { CatalogUnitOfWork } from '../domain/catalog-unit-of-work'
import type { Actor } from './actor'

/** Edits the texts (and the license-type fields), and activates or deactivates through `active`. */
export class UpdateCatalogItemUseCase {
  constructor(private readonly uow: CatalogUnitOfWork) {}

  async execute(
    actor: Actor,
    catalog: CatalogSlug,
    id: string,
    input: AnyCatalogItemUpdateInput,
  ): Promise<CatalogItem> {
    return this.uow.run(async ({ items, audit }) => {
      const current = await items.findById(catalog, id)
      if (!current) throw new NotFoundError('Catalog item not found')

      const requested: CatalogItemChanges = { ...input }
      // D3: saving a validity (even the placeholder's value) confirms it.
      if (catalog === 'license-types' && input.validityMonths !== undefined) requested.validityIsPlaceholder = false
      const before: Record<string, unknown> = {}
      const after: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(requested)) {
        const previous = current[key as keyof CatalogItem]
        if (value === undefined || value === previous) continue
        before[key] = previous
        after[key] = value
      }
      // Nothing actually changed: no write and no audit row for a change that did not occur.
      if (Object.keys(after).length === 0) return current

      const updated = await items.update(catalog, id, after as CatalogItemChanges)
      await audit.record({
        actorId: actor.id,
        action: 'actualizar',
        entity: CATALOG_ENTITIES[catalog],
        entityId: id,
        changes: { before, after },
      })
      return updated
    })
  }
}
