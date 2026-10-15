import type { AuditListQuery, Paginated } from '@sryg/types'
import type { AuditTrailEntry } from '../dtos/audit-trail.dto'
import type { AuditTrailRepository } from '../repositories/audit-trail.repository'

export class ListAuditEntriesService {
  constructor(private readonly trail: AuditTrailRepository) {}

  execute({ page, pageSize, ...filter }: AuditListQuery): Promise<Paginated<AuditTrailEntry>> {
    return this.trail.list(filter, { page, pageSize })
  }
}
