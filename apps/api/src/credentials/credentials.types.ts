import type { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import type { ActiveBlocksRepository } from '../common/credentials/repositories/active-blocks.repository'
import type { ValidityParametersRepository } from '../common/credentials/repositories/validity-parameters.repository'
import type { TransactionRunner } from '../common/database/transaction-runner'
import type { CardResourcesRepository } from './repositories/card-resources.repository'
import type { CredentialCardRepository } from './repositories/credential-card.repository'

/** What printing a credential reads, and its `emitir` audit row, bound to one transaction (BR-11). */
export interface CredentialsTransactionRepos {
  cards: CredentialCardRepository
  resources: CardResourcesRepository
  blocks: ActiveBlocksRepository
  validity: ValidityParametersRepository
  audit: AuditLogRepository
}

export type CredentialsTransaction = TransactionRunner<CredentialsTransactionRepos>
