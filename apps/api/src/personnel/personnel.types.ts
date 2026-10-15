import type { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import type { TransactionRunner } from '../common/database/transaction-runner'
import type { AttachmentRepository } from './repositories/attachment.repository'
import type { CatalogReferencesRepository } from './repositories/catalog-references.repository'
import type { PersonnelRepository } from './repositories/personnel.repository'

/** Repositories handed to a mutation: all of them are bound to the same transaction. */
export interface PersonnelTransactionRepos {
  personnel: PersonnelRepository
  audit: AuditLogRepository
  catalogs: CatalogReferencesRepository
  attachments: AttachmentRepository
}

export type PersonnelTransaction = TransactionRunner<PersonnelTransactionRepos>
