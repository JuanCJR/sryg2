import type { AlertsSummary, AlertsSummaryQuery } from '@sryg/types'
import type { AlertRepository } from '../domain/alert-repository'
import type { RecalculateAlertsUseCase } from './recalculate-alerts.use-case'

/** Recalculates before counting, like the list (D6). */
export class GetAlertsSummaryUseCase {
  constructor(
    private readonly recalculate: RecalculateAlertsUseCase,
    private readonly alerts: AlertRepository,
  ) {}

  async execute(filters: AlertsSummaryQuery): Promise<AlertsSummary> {
    await this.recalculate.execute()
    return this.alerts.summary(filters)
  }
}
