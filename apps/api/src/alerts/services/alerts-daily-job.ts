import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { RecalculateAlertsService } from './recalculate-alerts.service'

export const ALERTS_DAILY_JOB = 'alerts-daily-recalculation'

/** Daily recalculation (D6). GET /api/alerts also recalculates, since the free hosting sleeps. */
@Injectable()
export class AlertsDailyJob {
  private readonly logger = new Logger(AlertsDailyJob.name)

  constructor(private readonly recalculate: RecalculateAlertsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: ALERTS_DAILY_JOB })
  async run(): Promise<void> {
    try {
      const result = await this.recalculate.execute()
      this.logger.log(`Alerts recalculated: ${JSON.stringify(result)}`)
    } catch (error) {
      // A failed run must not crash the process; the next GET or run recalculates again.
      this.logger.error('Alerts recalculation failed', error instanceof Error ? error.stack : String(error))
    }
  }
}
