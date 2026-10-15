import type { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import type { TransactionRunner } from '../common/database/transaction-runner'
import type { GraphicResourceRepository } from './repositories/graphic-resource.repository'
import type { SystemParameterRepository } from './repositories/system-parameter.repository'

/** Repositories handed to a mutation: all of them are bound to the same transaction (BR-11). */
export interface SettingsTransactionRepos {
  parameters: SystemParameterRepository
  graphicResources: GraphicResourceRepository
  audit: AuditLogRepository
}

export type SettingsTransaction = TransactionRunner<SettingsTransactionRepos>
