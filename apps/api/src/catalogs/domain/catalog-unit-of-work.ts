import type { AuditLog } from '../../audit/domain/audit-log'
import type { UnitOfWork } from '../../shared/domain/unit-of-work'
import type { CatalogItemRepository } from './catalog-item-repository'

/** Repositories handed to a mutation: both are bound to the same transaction (BR-11). */
export interface CatalogUowRepos {
  items: CatalogItemRepository
  audit: AuditLog
}

export type CatalogUnitOfWork = UnitOfWork<CatalogUowRepos>
