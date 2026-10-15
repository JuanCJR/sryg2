import type { AlertsSummary, AlertsSummaryQuery } from '@sryg/types'
import type { AlertRepository } from '../repositories/alert.repository'
import type { RecalculateAlertsService } from './recalculate-alerts.service'

/** Recalculates before counting, like the list (D6). */
export class GetAlertsSummaryService {
  constructor(
    private readonly recalculate: RecalculateAlertsService,
    private readonly alerts: AlertRepository,
  ) {}

  async execute(filters: AlertsSummaryQuery): Promise<AlertsSummary> {
    await this.recalculate.execute()
    return this.alerts.summary(filters)
  }
}
