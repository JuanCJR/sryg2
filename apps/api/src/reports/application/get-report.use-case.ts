import { canAccessReport, type ReportId, type ReportPage, type ReportQuery } from '@sryg/types'
import { ForbiddenError } from '../../shared/domain/errors'
import type { ReportViewer } from '../domain/report-viewer'
import type { ReportGenerator } from './report-generator'

/** One page of a report. Consulta reads only report 1 (D10). Reads are not audited. */
export class GetReportUseCase {
  constructor(private readonly generator: ReportGenerator) {}

  async execute<R extends ReportId>(
    user: ReportViewer,
    report: R,
    { page, pageSize, ...filters }: ReportQuery,
  ): Promise<ReportPage<R>> {
    if (!canAccessReport(user.role, user.area, report, 'read')) throw new ForbiddenError('Forbidden')
    const { rows, generatedAt, today, threshold } = await this.generator.generate(report, filters)
    return {
      report,
      generatedAt: generatedAt.toISOString(),
      today,
      thresholdDays: threshold.value,
      thresholdIsPlaceholder: threshold.isPlaceholder,
      items: rows.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: rows.length,
    }
  }
}
