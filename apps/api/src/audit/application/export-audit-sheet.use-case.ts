import type { AuditExportQuery } from '@sryg/types'
import { buildXlsx } from '../../shared/spreadsheet/xlsx'
import { toAuditSheet } from '../domain/audit-sheet'
import type { AuditTrailReader } from '../domain/audit-trail'

/** Read-only Excel export (REP-05): it does not write to the trail itself. */
export class ExportAuditSheetUseCase {
  constructor(private readonly trail: AuditTrailReader) {}

  async execute(filter: AuditExportQuery, now = new Date()): Promise<Buffer> {
    const entries = await this.trail.all(filter)
    return buildXlsx(toAuditSheet(entries, now), { createdAt: now, author: 'SRYG · INAC Maracay' })
  }
}
