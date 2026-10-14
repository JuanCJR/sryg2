import type { Alert, AlertsQuery, Paginated } from '@sryg/types'
import type { AlertRepository } from '../domain/alert-repository'
import type { RecalculateAlertsUseCase } from './recalculate-alerts.use-case'

/** Recalculates before reading: the free hosting sleeps and may miss the daily job (D6). */
export class ListAlertsUseCase {
  constructor(
    private readonly recalculate: RecalculateAlertsUseCase,
    private readonly alerts: AlertRepository,
  ) {}

  async execute(query: AlertsQuery): Promise<Paginated<Alert>> {
    await this.recalculate.execute()
    return this.alerts.list(query)
  }
}
