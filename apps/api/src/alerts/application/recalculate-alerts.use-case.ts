import type { ValidityParametersReader } from '../../shared/credentials/domain/validity-parameters-reader'
import { desiredAlerts } from '../domain/alert'
import type { AlertsUnitOfWork } from '../domain/alerts-unit-of-work'
import { addDays, type Clock, isoDay } from '../domain/clock'

/**
 * Rebuilds the alert table from the credentials (ALR-01, D6). Idempotent: running it twice in the
 * same day changes nothing. The threshold is the configurable parameter (D3, BR-02).
 */
export class RecalculateAlertsUseCase {
  constructor(
    private readonly uow: AlertsUnitOfWork,
    private readonly parameters: ValidityParametersReader,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<{ created: number; updated: number; removed: number }> {
    const { value: threshold } = await this.parameters.alertThresholdDays()
    const today = isoDay(this.clock.now())
    return this.uow.run(async ({ alerts }) => {
      await alerts.lockForRecalculation()
      const credentials = await alerts.findExpiringCredentials(addDays(today, threshold))
      return alerts.sync(desiredAlerts(credentials, today, threshold))
    })
  }
}
