import type { AuditExportQuery } from '@sryg/types'
import { buildXlsx } from '../../common/spreadsheet/xlsx'
import type { AuditTrailRepository } from '../repositories/audit-trail.repository'
import { toAuditSheet } from './audit-sheet'

/** Read-only Excel export (REP-05): it does not write to the trail itself. */
export class ExportAuditSheetService {
  constructor(private readonly trail: AuditTrailRepository) {}

  async execute(filter: AuditExportQuery, now = new Date()): Promise<Buffer> {
    const entries = await this.trail.all(filter)
    return buildXlsx(toAuditSheet(entries, now), { createdAt: now, author: 'SRYG · INAC Maracay' })
  }
}
