import type { AuditLog } from '../../audit/domain/audit-log'
import type { ActiveBlockQuery } from '../../shared/credentials/domain/active-block-query'
import type { ValidityParametersReader } from '../../shared/credentials/domain/validity-parameters-reader'
import type { UnitOfWork } from '../../shared/domain/unit-of-work'
import type {
  HolderLookup,
  MedicalCertificateRepository,
  MedicalObservationCatalog,
} from './medical-certificate-repository'

/** Everything a mutation reads and writes, bound to the same transaction (BR-11, NFR-09). */
export interface MedicalCertificatesUowRepos {
  certificates: MedicalCertificateRepository
  observations: MedicalObservationCatalog
  holders: HolderLookup
  blocks: ActiveBlockQuery
  validity: ValidityParametersReader
  audit: AuditLog
}

export type MedicalCertificatesUnitOfWork = UnitOfWork<MedicalCertificatesUowRepos>
