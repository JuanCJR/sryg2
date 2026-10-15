import type { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import type { TransactionRunner } from '../common/database/transaction-runner'
import type { UserAdminRepository } from './repositories/user-admin.repository'

/** Repositories handed to a mutation: both are bound to the same transaction (BR-11). */
export interface UsersTransactionRepos {
  users: UserAdminRepository
  audit: AuditLogRepository
}

export type UsersTransaction = TransactionRunner<UsersTransactionRepos>
