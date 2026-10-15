import type { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import type { TransactionRunner } from '../common/database/transaction-runner'
import type { AlertRepository } from './repositories/alert.repository'

/** Repositories handed to a mutation: both are bound to the same transaction. */
export interface AlertsTransactionRepos {
  alerts: AlertRepository
  audit: AuditLogRepository
}

export type AlertsTransaction = TransactionRunner<AlertsTransactionRepos>
