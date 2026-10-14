import type { AuditAction } from '@sryg/types'

export interface AuditEntry {
  /** Null = anonymous/system event (e.g. failed login). */
  actorId: string | null
  action: AuditAction
  entity: string
  entityId: string | null
  /** Never include secrets such as password hashes. */
  changes?: { before?: unknown; after?: unknown }
}

/** Append-only audit trail (BR-11). */
export interface AuditLog {
  record(entry: AuditEntry): Promise<void>
}
