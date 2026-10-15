import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import type { Db } from '@sryg/db'
import { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import { Clock } from '../common/clock'
import { CredentialsCoreModule } from '../common/credentials/credentials-core.module'
import { ValidityParametersRepository } from '../common/credentials/repositories/validity-parameters.repository'
import { DB } from '../common/database/database.module'
import { TransactionRunner } from '../common/database/transaction-runner'
import type { AlertsTransaction } from './alerts.types'
import { AlertsController } from './controllers/alerts.controller'
import { AlertRepository } from './repositories/alert.repository'
import { AcknowledgeAlertService } from './services/acknowledge-alert.service'
import { AlertsDailyJob } from './services/alerts-daily-job'
import { GetAlertsSummaryService } from './services/get-alerts-summary.service'
import { ListAlertsService } from './services/list-alerts.service'
import { RecalculateAlertsService } from './services/recalculate-alerts.service'

const ALERTS_TRANSACTION = Symbol('ALERTS_TRANSACTION')

/** Expiry alerts (W1-9): see README.md. Only module using @nestjs/schedule, so it registers it. */
@Module({
  imports: [CredentialsCoreModule, ScheduleModule.forRoot()],
  controllers: [AlertsController],
  providers: [
    Clock,
    { provide: AlertRepository, inject: [DB], useFactory: (db: Db) => new AlertRepository(db) },
    {
      provide: ALERTS_TRANSACTION,
      inject: [DB],
      useFactory: (db: Db) =>
        new TransactionRunner(db, (tx) => ({ alerts: new AlertRepository(tx), audit: new AuditLogRepository(tx) })),
    },
    {
      provide: RecalculateAlertsService,
      inject: [ALERTS_TRANSACTION, ValidityParametersRepository, Clock],
      useFactory: (transaction: AlertsTransaction, parameters: ValidityParametersRepository, clock: Clock) =>
        new RecalculateAlertsService(transaction, parameters, clock),
    },
    {
      provide: ListAlertsService,
      inject: [RecalculateAlertsService, AlertRepository],
      useFactory: (recalculate: RecalculateAlertsService, alerts: AlertRepository) =>
        new ListAlertsService(recalculate, alerts),
    },
    {
      provide: GetAlertsSummaryService,
      inject: [RecalculateAlertsService, AlertRepository],
      useFactory: (recalculate: RecalculateAlertsService, alerts: AlertRepository) =>
        new GetAlertsSummaryService(recalculate, alerts),
    },
    {
      provide: AcknowledgeAlertService,
      inject: [ALERTS_TRANSACTION, Clock],
      useFactory: (transaction: AlertsTransaction, clock: Clock) => new AcknowledgeAlertService(transaction, clock),
    },
    AlertsDailyJob,
  ],
})
export class AlertsModule {}
