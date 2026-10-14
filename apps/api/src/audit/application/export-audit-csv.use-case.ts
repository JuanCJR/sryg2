import type { AuditExportQuery } from '@sryg/types'
import { toAuditCsv } from '../domain/audit-csv'
import type { AuditTrailReader } from '../domain/audit-trail'

/** Read-only export (REP-05): it does not write to the trail itself. */
export class ExportAuditCsvUseCase {
  constructor(private readonly trail: AuditTrailReader) {}

  async execute(filter: AuditExportQuery): Promise<string> {
    return toAuditCsv(await this.trail.all(filter))
  }
}
