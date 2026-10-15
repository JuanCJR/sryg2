import type { AnyCatalogItemCreateInput, CatalogSlug } from '@sryg/types'
import type { CatalogTransaction } from '../catalogs.types'
import type { Actor } from '../dtos/actor.dto'
import { CATALOG_ENTITIES, type CatalogItem, type NewCatalogItem } from './catalog-item'

export class CreateCatalogItemService {
  constructor(private readonly transaction: CatalogTransaction) {}

  async execute(actor: Actor, catalog: CatalogSlug, input: AnyCatalogItemCreateInput): Promise<CatalogItem> {
    const data: NewCatalogItem = { nameEs: input.nameEs, nameEn: input.nameEn ?? null }
    if (catalog === 'license-types') {
      data.rav60Category = input.rav60Category
      data.requiredMedicalClass = input.requiredMedicalClass ?? null
      if (input.appliesExpiry !== undefined) data.appliesExpiry = input.appliesExpiry
      // D3: a validity the Admin types is a real value, not the seed's placeholder.
      if (input.validityMonths !== undefined) {
        data.validityMonths = input.validityMonths
        data.validityIsPlaceholder = false
      }
    }
    return this.transaction.run(async ({ items, audit }) => {
      // The item is written first: a duplicate name throws before any audit row exists.
      const created = await items.create(catalog, data)
      await audit.record({
        actorId: actor.id,
        action: 'crear',
        entity: CATALOG_ENTITIES[catalog],
        entityId: created.id,
        changes: { after: created },
      })
      return created
    })
  }
}
