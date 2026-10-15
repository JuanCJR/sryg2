import type { Alert, AlertsQuery, Paginated } from '@sryg/types'
import type { AlertRepository } from '../repositories/alert.repository'
import type { RecalculateAlertsService } from './recalculate-alerts.service'

/** Recalculates before reading: the free hosting sleeps and may miss the daily job (D6). */
export class ListAlertsService {
  constructor(
    private readonly recalculate: RecalculateAlertsService,
    private readonly alerts: AlertRepository,
  ) {}

  async execute(query: AlertsQuery): Promise<Paginated<Alert>> {
    await this.recalculate.execute()
    return this.alerts.list(query)
  }
}
