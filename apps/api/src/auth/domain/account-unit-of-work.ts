import type { AuditLog } from '../../audit/domain/audit-log'
import type { UnitOfWork } from '../../shared/domain/unit-of-work'

export interface PasswordWriter {
  /** Stores the new hash and clears `must_change_password` (D4). */
  setOwnPassword(userId: string, passwordHash: string): Promise<void>
}

/** Repositories handed to a change of the user's own account: bound to the same transaction. */
export interface AccountUowRepos {
  passwords: PasswordWriter
  audit: AuditLog
}

export type AccountUnitOfWork = UnitOfWork<AccountUowRepos>
