import type { AuditLog } from '../../audit/domain/audit-log'
import type { ActiveBlockQuery } from '../../shared/credentials/domain/active-block-query'
import type { ValidityParametersReader } from '../../shared/credentials/domain/validity-parameters-reader'
import type { UnitOfWork } from '../../shared/domain/unit-of-work'
import type { CardResourcesReader, CredentialCardReader } from './credential-card'

/** What printing a credential reads, and its `emitir` audit row, bound to one transaction (BR-11). */
export interface CredentialsUowRepos {
  cards: CredentialCardReader
  resources: CardResourcesReader
  blocks: ActiveBlockQuery
  validity: ValidityParametersReader
  audit: AuditLog
}

export type CredentialsUnitOfWork = UnitOfWork<CredentialsUowRepos>
