import type { AuditLog } from '../../audit/domain/audit-log'
import type { UnitOfWork } from '../../shared/domain/unit-of-work'
import type { UserAdminRepository } from './user-admin-repository'

/** Repositories handed to a mutation: both are bound to the same transaction (BR-11). */
export interface UsersUowRepos {
  users: UserAdminRepository
  audit: AuditLog
}

export type UsersUnitOfWork = UnitOfWork<UsersUowRepos>
