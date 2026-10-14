import type { AuditLog } from '../../audit/domain/audit-log'
import type { UnitOfWork } from '../../shared/domain/unit-of-work'
import type { AlertRepository } from './alert-repository'

/** Repositories handed to a mutation: both are bound to the same transaction. */
export interface AlertsUowRepos {
  alerts: AlertRepository
  audit: AuditLog
}

export type AlertsUnitOfWork = UnitOfWork<AlertsUowRepos>
