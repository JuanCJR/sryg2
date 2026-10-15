import type { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import type { TransactionRunner } from '../common/database/transaction-runner'
import type { CatalogItemRepository } from './repositories/catalog-item.repository'

/** Repositories handed to a mutation: both are bound to the same transaction (BR-11). */
export interface CatalogTransactionRepos {
  items: CatalogItemRepository
  audit: AuditLogRepository
}

export type CatalogTransaction = TransactionRunner<CatalogTransactionRepos>
