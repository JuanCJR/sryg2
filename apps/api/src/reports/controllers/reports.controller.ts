import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common'
import {
  type ReportExportQuery,
  reportExportQuerySchema,
  type ReportId,
  reportIdSchema,
  type ReportQuery,
  reportQuerySchema,
} from '@sryg/types'
import type { Response } from 'express'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { ExportReportService } from '../services/export-report.service'
import { GetReportService } from '../services/get-report.service'

const reportPipe = new ZodValidationPipe(reportIdSchema)

/** Every role reads (Consulta only report 1); Admin and Supervisors of any area export (D10). */
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly getReport: GetReportService,
    private readonly exportReport: ExportReportService,
  ) {}

  @Get(':report')
  @RequirePermission('reports', 'read')
  get(
    @Req() request: AuthenticatedRequest,
    @Param('report', reportPipe) report: ReportId,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: ReportQuery,
  ) {
    return this.getReport.execute(request.user, report, query)
  }

  @Get(':report/export')
  @RequirePermission('reports', 'export')
  async export(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
    @Param('report', reportPipe) report: ReportId,
    @Query(new ZodValidationPipe(reportExportQuerySchema)) query: ReportExportQuery,
  ) {
    const file = await this.exportReport.execute(request.user, report, query)
    response
      .status(200)
      .set({
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Cache-Control': 'no-store',
      })
      .send(file.body)
  }
}
