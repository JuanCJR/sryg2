import type { AuditAction } from '@sryg/types'

/** One entry of the trail as the viewer reads it (REP-04): who, what, on which entity, when. */
export interface AuditTrailEntry {
  id: number
  occurredAt: Date
  /** Null = anonymous or system event (e.g. a failed login). */
  actor: { id: string; fullName: string; email: string } | null
  action: AuditAction
  entity: string
  entityId: string | null
  changes: { before?: unknown; after?: unknown } | null
}

export interface AuditPage {
  page: number
  pageSize: number
}
