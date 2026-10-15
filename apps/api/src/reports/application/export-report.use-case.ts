import { canAccessReport, type ReportExportQuery, type ReportFilters, type ReportId } from '@sryg/types'
import type { AuditLog } from '../../audit/domain/audit-log'
import { ForbiddenError } from '../../shared/domain/errors'
import type { ReportDataSource } from '../domain/report-dataset'
import type { ReportFileRenderer } from '../domain/report-file-renderer'
import { RAV60_LABELS, STATUS_LABELS, toReportTable } from '../domain/report-table'
import type { ReportViewer } from '../domain/report-viewer'
import type { ReportGenerator } from './report-generator'

export interface ReportFile {
  filename: string
  contentType: string
  body: Buffer
}

export const REPORT_AUDIT_ENTITY = 'reporte'

/**
 * Exports every row matching the filters to CSV or PDF (REP-02) and records the export in the audit
 * trail with the report, format, filters and row count. Consulta exports nothing (§4, D10).
 */
export class ExportReportUseCase {
  constructor(
    private readonly generator: ReportGenerator,
    private readonly source: ReportDataSource,
    private readonly renderers: readonly ReportFileRenderer[],
    private readonly audit: AuditLog,
  ) {}

  async execute(user: ReportViewer, report: ReportId, { format, ...query }: ReportExportQuery): Promise<ReportFile> {
    if (!canAccessReport(user.role, user.area, report, 'export')) throw new ForbiddenError('Forbidden')
    const renderer = this.renderers.find((r) => r.format === format)
    if (!renderer) throw new Error(`No renderer for ${format}`)
    const filters = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined)) as ReportFilters
    const { rows, generatedAt, today, threshold } = await this.generator.generate(report, filters)
    const details = [
      `Fecha de referencia: ${today}`,
      `Umbral de próxima a vencer: ${threshold.value} días${threshold.isPlaceholder ? ' (PENDIENTE INAC)' : ''}`,
      ...(await this.describeFilters(filters)),
      `Registros: ${rows.length}`,
    ]
    const body = await renderer.render(toReportTable(report, rows), {
      generatedAt: generatedAt.toISOString(),
      details,
    })
    await this.audit.record({
      actorId: user.id,
      action: 'exportar',
      entity: REPORT_AUDIT_ENTITY,
      entityId: null,
      changes: { after: { report, format, filters, rows: rows.length } },
    })
    const stamp = today.replaceAll('-', '')
    return { filename: `${report}-${stamp}.${format}`, contentType: renderer.contentType, body }
  }

  private async describeFilters(filters: ReportFilters): Promise<string[]> {
    const lines: string[] = []
    if (filters.q) lines.push(`Búsqueda: ${filters.q}`)
    if (filters.licenseTypeId) {
      const names = await Promise.all(
        filters.licenseTypeId.map(async (id) => (await this.source.licenseTypeName(id)) ?? id),
      )
      lines.push(`Tipo de licencia: ${names.join(', ')}`)
    }
    if (filters.rav60Category)
      lines.push(`Categoría RAV 60: ${filters.rav60Category.map((c) => RAV60_LABELS[c]).join(', ')}`)
    if (filters.status) lines.push(`Estado: ${filters.status.map((s) => STATUS_LABELS[s]).join(', ')}`)
    if (filters.from || filters.to) lines.push(`Rango de fechas: ${filters.from ?? '…'} a ${filters.to ?? '…'}`)
    return lines
  }
}
