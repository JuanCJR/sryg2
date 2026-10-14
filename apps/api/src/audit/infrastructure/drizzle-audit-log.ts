import { auditoria, type DbExecutor } from '@sryg/db'
import type { AuditEntry, AuditLog } from '../domain/audit-log'

/** Writes through whichever executor it receives: a transaction handle inside a unit of work, or the pool. */
export class DrizzleAuditLog implements AuditLog {
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
