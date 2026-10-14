import type { AuditAction, AuditFilter, Paginated } from '@sryg/types'

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

/** Read side of the append-only trail. Newest first, ties broken by insertion order. */
export interface AuditTrailReader {
  list(filter: AuditFilter, page: AuditPage): Promise<Paginated<AuditTrailEntry>>
  /** Every entry matching the filter, for the export (REP-05). */
  all(filter: AuditFilter): Promise<AuditTrailEntry[]>
}
