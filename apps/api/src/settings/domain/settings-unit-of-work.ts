import type { AuditLog } from '../../audit/domain/audit-log'
import type { UnitOfWork } from '../../shared/domain/unit-of-work'
import type { GraphicResourceRepository } from './graphic-resource'
import type { SystemParameterRepository } from './system-parameter'

/** Repositories handed to a mutation: all of them are bound to the same transaction (BR-11). */
export interface SettingsUowRepos {
  parameters: SystemParameterRepository
  graphicResources: GraphicResourceRepository
  audit: AuditLog
}

export type SettingsUnitOfWork = UnitOfWork<SettingsUowRepos>
