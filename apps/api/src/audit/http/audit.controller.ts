import { Controller, Get, Query, Res } from '@nestjs/common'
import { type AuditExportQuery, auditExportQuerySchema, type AuditListQuery, auditListQuerySchema } from '@sryg/types'
import type { Response } from 'express'
import { RequirePermission } from '../../shared/http/require-permission.decorator'
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe'
import { XLSX_CONTENT_TYPE } from '../../shared/spreadsheet/xlsx'
import { ExportAuditSheetUseCase } from '../application/export-audit-sheet.use-case'
import { ListAuditEntriesUseCase } from '../application/list-audit-entries.use-case'

/** "auditoria-20261014-153000.xlsx" (UTC). */
function exportFilename(now: Date): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
  return `auditoria-${stamp}.xlsx`
}

/** Audit viewer (REP-04/REP-05): read-only, for the Admin and Supervisors of any area (D1). */
@Controller('audit')
export class AuditController {
  constructor(
    private readonly listEntries: ListAuditEntriesUseCase,
    private readonly exportSheet: ExportAuditSheetUseCase,
  ) {}

  @Get()
  @RequirePermission('audit', 'read')
  list(@Query(new ZodValidationPipe(auditListQuerySchema)) query: AuditListQuery) {
    return this.listEntries.execute(query)
  }

  @Get('export.xlsx')
  @RequirePermission('audit', 'read')
  async export(
    @Query(new ZodValidationPipe(auditExportQuerySchema)) query: AuditExportQuery,
    @Res() response: Response,
  ): Promise<void> {
    const now = new Date()
    const file = await this.exportSheet.execute(query, now)
    response
      .status(200)
      .set({
        'Content-Type': XLSX_CONTENT_TYPE,
        'Content-Disposition': `attachment; filename="${exportFilename(now)}"`,
        'Cache-Control': 'no-store',
      })
      .send(file)
  }
}
