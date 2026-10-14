import type { AuditLog } from '../../audit/domain/audit-log'
import type { ActiveBlockQuery } from '../../shared/credentials/domain/active-block-query'
import type { ValidityParametersReader } from '../../shared/credentials/domain/validity-parameters-reader'
import type { UnitOfWork } from '../../shared/domain/unit-of-work'
import type { LicenseReader } from './license-reader'
import type { LicenseStore } from './license-store'

/** Everything a trámite reads and writes, bound to the same transaction (BR-11, NFR-09). */
export interface LicensesUowRepos {
  store: LicenseStore
  reader: LicenseReader
  audit: AuditLog
  blocks: ActiveBlockQuery
  validity: ValidityParametersReader
}

export type LicensesUnitOfWork = UnitOfWork<LicensesUowRepos>
