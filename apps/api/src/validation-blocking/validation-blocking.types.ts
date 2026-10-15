import type { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import type { TransactionRunner } from '../common/database/transaction-runner'
import type { BlockRepository } from './repositories/block.repository'

/** Repositories handed to a mutation: both are bound to the same transaction. */
export interface BlockingTransactionRepos {
  blocks: BlockRepository
  audit: AuditLogRepository
}

export type BlockingTransaction = TransactionRunner<BlockingTransactionRepos>
