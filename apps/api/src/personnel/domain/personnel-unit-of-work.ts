import type { AuditLog } from '../../audit/domain/audit-log'
import type { UnitOfWork } from '../../shared/domain/unit-of-work'
import type { CatalogReferences } from './catalog-references'
import type { PersonnelRepository } from './personnel-repository'

/** Repositories handed to a mutation: all of them are bound to the same transaction. */
export interface PersonnelUowRepos {
  personnel: PersonnelRepository
  audit: AuditLog
  catalogs: CatalogReferences
}

export type PersonnelUnitOfWork = UnitOfWork<PersonnelUowRepos>
