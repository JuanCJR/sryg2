import type { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import type { ActiveBlocksRepository } from '../common/credentials/repositories/active-blocks.repository'
import type { ValidityParametersRepository } from '../common/credentials/repositories/validity-parameters.repository'
import type { TransactionRunner } from '../common/database/transaction-runner'
import type { LicenseQueryRepository } from './repositories/license-query.repository'
import type { LicenseRepository } from './repositories/license.repository'

/** Everything a trámite reads and writes, bound to the same transaction (BR-11, NFR-09). */
export interface LicensesTransactionRepos {
  store: LicenseRepository
  reader: LicenseQueryRepository
  audit: AuditLogRepository
  blocks: ActiveBlocksRepository
  validity: ValidityParametersRepository
}

export type LicensesTransaction = TransactionRunner<LicensesTransactionRepos>
