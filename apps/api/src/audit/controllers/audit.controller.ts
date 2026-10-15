import { Controller, Get, Query, Res } from '@nestjs/common'
import { type AuditExportQuery, auditExportQuerySchema, type AuditListQuery, auditListQuerySchema } from '@sryg/types'
import type { Response } from 'express'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { ExportAuditCsvService } from '../services/export-audit-csv.service'
import { ListAuditEntriesService } from '../services/list-audit-entries.service'

/** "auditoria-20261014-153000.csv" (UTC). */
function exportFilename(now: Date): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
  return `auditoria-${stamp}.csv`
}

/** Audit viewer (REP-04/REP-05): read-only, for the Admin and Supervisors of any area (D1). */
@Controller('audit')
export class AuditController {
  constructor(
    private readonly listEntries: ListAuditEntriesService,
    private readonly exportCsv: ExportAuditCsvService,
  ) {}

  @Get()
  @RequirePermission('audit', 'read')
  list(@Query(new ZodValidationPipe(auditListQuerySchema)) query: AuditListQuery) {
    return this.listEntries.execute(query)
  }

  @Get('export.csv')
  @RequirePermission('audit', 'read')
  async export(
    @Query(new ZodValidationPipe(auditExportQuerySchema)) query: AuditExportQuery,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    const csv = await this.exportCsv.execute(query)
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader('Content-Disposition', `attachment; filename="${exportFilename(new Date())}"`)
    return csv
  }
}
