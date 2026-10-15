import type { AuditExportQuery } from '@sryg/types'
import type { AuditTrailRepository } from '../repositories/audit-trail.repository'
import { toAuditCsv } from './audit-csv'

/** Read-only export (REP-05): it does not write to the trail itself. */
export class ExportAuditCsvService {
  constructor(private readonly trail: AuditTrailRepository) {}

  async execute(filter: AuditExportQuery): Promise<string> {
    return toAuditCsv(await this.trail.all(filter))
  }
}
