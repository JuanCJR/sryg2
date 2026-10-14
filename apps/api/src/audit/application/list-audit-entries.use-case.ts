import type { AuditListQuery, Paginated } from '@sryg/types'
import type { AuditTrailEntry, AuditTrailReader } from '../domain/audit-trail'

export class ListAuditEntriesUseCase {
  constructor(private readonly trail: AuditTrailReader) {}

  execute({ page, pageSize, ...filter }: AuditListQuery): Promise<Paginated<AuditTrailEntry>> {
    return this.trail.list(filter, { page, pageSize })
  }
}
