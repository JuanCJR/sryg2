import type { AuditLog } from '../../audit/domain/audit-log'
import type { UnitOfWork } from '../../shared/domain/unit-of-work'
import type { BlockRepository } from './block-repository'

/** Repositories handed to a mutation: both are bound to the same transaction. */
export interface BlockingUowRepos {
  blocks: BlockRepository
  audit: AuditLog
}

export type BlockingUnitOfWork = UnitOfWork<BlockingUowRepos>
