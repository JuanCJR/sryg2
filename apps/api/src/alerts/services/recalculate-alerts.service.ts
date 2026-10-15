import { addDays, type Clock, isoDay } from '../../common/clock'
import type { ValidityParametersRepository } from '../../common/credentials/repositories/validity-parameters.repository'
import type { AlertsTransaction } from '../alerts.types'
import { desiredAlerts } from './alert'

/**
 * Rebuilds the alert table from the credentials (ALR-01, D6). Idempotent: running it twice in the
 * same day changes nothing. The threshold is the configurable parameter (D3, BR-02).
 */
export class RecalculateAlertsService {
  constructor(
    private readonly transaction: AlertsTransaction,
    private readonly parameters: ValidityParametersRepository,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<{ created: number; updated: number; removed: number }> {
    const { value: threshold } = await this.parameters.alertThresholdDays()
    const today = isoDay(this.clock.now())
    return this.transaction.run(async ({ alerts }) => {
      await alerts.lockForRecalculation()
      const credentials = await alerts.findExpiringCredentials(addDays(today, threshold))
      return alerts.sync(desiredAlerts(credentials, today, threshold))
    })
  }
}
