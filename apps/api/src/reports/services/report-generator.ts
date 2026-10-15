import type { ReportFilters, ReportId, ReportRowById } from '@sryg/types'
import type { Clock } from '../../common/clock'
import type { ParameterValue } from '../../common/credentials/dtos/validity-parameters.dto'
import type { ActiveBlocksRepository } from '../../common/credentials/repositories/active-blocks.repository'
import type { ValidityParametersRepository } from '../../common/credentials/repositories/validity-parameters.repository'
import type { ReportDataRepository } from '../repositories/report-data.repository'
import { buildActiveBlocksReport, buildConsolidatedReport, buildExpiryReport } from './build-reports'

export interface GeneratedReport<R extends ReportId> {
  rows: ReportRowById[R][]
  generatedAt: Date
  /** `YYYY-MM-DD` (UTC) the statuses were derived for. */
  today: string
  threshold: ParameterValue<number>
}

/**
 * Builds any of the three reports with the statuses of `deriveCredentialStatus`: the threshold
 * comes from the validity parameters (D3) and the blocks from the shared ActiveBlocksRepository (BR-07).
 */
export class ReportGenerator {
  constructor(
    private readonly source: ReportDataRepository,
    private readonly parameters: ValidityParametersRepository,
    private readonly blocks: ActiveBlocksRepository,
    private readonly clock: Clock,
  ) {}

  async generate<R extends ReportId>(report: R, filters: ReportFilters): Promise<GeneratedReport<R>> {
    const generatedAt = this.clock.now()
    const today = generatedAt.toISOString().slice(0, 10)
    const [data, threshold] = await Promise.all([
      this.source.load({ q: filters.q }),
      this.parameters.alertThresholdDays(),
    ])
    const blockedPersonIds = await this.blocks.withActiveBlock(data.people.map((p) => p.id))
    const ctx = { today, thresholdDays: threshold.value, blockedPersonIds }
    const builders: { [K in ReportId]: () => ReportRowById[K][] } = {
      vencimientos: () => buildExpiryReport(data, ctx, filters),
      estado_consolidado: () => buildConsolidatedReport(data, ctx, filters),
      bloqueos_activos: () => buildActiveBlocksReport(data, filters),
    }
    return { rows: builders[report]() as ReportRowById[R][], generatedAt, today, threshold }
  }
}
