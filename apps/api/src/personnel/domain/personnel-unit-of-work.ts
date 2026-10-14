import type { AuditLog } from '../../audit/domain/audit-log'
import type { UnitOfWork } from '../../shared/domain/unit-of-work'
import type { PersonnelRepository } from './personnel-repository'

/** Repositories handed to a mutation: both are bound to the same transaction. */
export interface PersonnelUowRepos {
  personnel: PersonnelRepository
  audit: AuditLog
}

export type PersonnelUnitOfWork = UnitOfWork<PersonnelUowRepos>
