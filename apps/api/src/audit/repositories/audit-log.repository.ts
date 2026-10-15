import { auditoria, type DbExecutor } from '@sryg/db'
import type { AuditEntry } from '../dtos/audit-entry.dto'

/** Writes through whichever executor it receives: a transaction handle inside a transaction run, or the pool. */
export class AuditLogRepository {
  constructor(private readonly executor: DbExecutor) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.executor.insert(auditoria).values({
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      changes: entry.changes ?? null,
    })
  }
}
