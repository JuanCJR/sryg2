import type { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import type { TransactionRunner } from '../common/database/transaction-runner'
import type { PasswordRepository } from './repositories/password.repository'

/** Repositories handed to a change of the user's own account: bound to the same transaction. */
export interface AccountTransactionRepos {
  passwords: PasswordRepository
  audit: AuditLogRepository
}

export type AccountTransaction = TransactionRunner<AccountTransactionRepos>
