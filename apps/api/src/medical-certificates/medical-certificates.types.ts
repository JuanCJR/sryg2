import type { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import type { ActiveBlocksRepository } from '../common/credentials/repositories/active-blocks.repository'
import type { ValidityParametersRepository } from '../common/credentials/repositories/validity-parameters.repository'
import type { TransactionRunner } from '../common/database/transaction-runner'
import type {
  HolderLookup,
  MedicalCertificateRepository,
  MedicalObservationCatalog,
} from './repositories/medical-certificate.repository'

/** Everything a mutation reads and writes, bound to the same transaction (BR-11, NFR-09). */
export interface MedicalCertificatesTransactionRepos {
  certificates: MedicalCertificateRepository
  observations: MedicalObservationCatalog
  holders: HolderLookup
  blocks: ActiveBlocksRepository
  validity: ValidityParametersRepository
  audit: AuditLogRepository
}

export type MedicalCertificatesTransaction = TransactionRunner<MedicalCertificatesTransactionRepos>
