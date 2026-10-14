import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import type { Db } from '@sryg/db'
import { DrizzleAuditLog } from '../audit/infrastructure/drizzle-audit-log'
import { DB } from '../infrastructure/database/database.module'
import { DrizzleUnitOfWork } from '../infrastructure/database/drizzle-unit-of-work'
import { CredentialsCoreModule, VALIDITY_PARAMETERS_READER } from '../shared/credentials/credentials-core.module'
import type { ValidityParametersReader } from '../shared/credentials/domain/validity-parameters-reader'
import { AcknowledgeAlertUseCase } from './application/acknowledge-alert.use-case'
import { GetAlertsSummaryUseCase } from './application/get-alerts-summary.use-case'
import { ListAlertsUseCase } from './application/list-alerts.use-case'
import { RecalculateAlertsUseCase } from './application/recalculate-alerts.use-case'
import type { AlertRepository } from './domain/alert-repository'
import type { AlertsUnitOfWork } from './domain/alerts-unit-of-work'
import type { Clock } from './domain/clock'
import { AlertsController } from './http/alerts.controller'
import { AlertsDailyJob } from './infrastructure/alerts-daily-job'
import { DrizzleAlertRepository } from './infrastructure/drizzle-alert.repository'
import { SystemClock } from './infrastructure/system-clock'

const ALERT_READER = Symbol('ALERT_READER')
const ALERTS_UOW = Symbol('ALERTS_UOW')
const CLOCK = Symbol('CLOCK')

/** Expiry alerts (W1-9): see README.md. Only module using @nestjs/schedule, so it registers it. */
@Module({
  imports: [CredentialsCoreModule, ScheduleModule.forRoot()],
  controllers: [AlertsController],
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    { provide: ALERT_READER, inject: [DB], useFactory: (db: Db) => new DrizzleAlertRepository(db) },
    {
      provide: ALERTS_UOW,
      inject: [DB],
      useFactory: (db: Db) =>
        new DrizzleUnitOfWork(db, (tx) => ({ alerts: new DrizzleAlertRepository(tx), audit: new DrizzleAuditLog(tx) })),
    },
    {
      provide: RecalculateAlertsUseCase,
      inject: [ALERTS_UOW, VALIDITY_PARAMETERS_READER, CLOCK],
      useFactory: (uow: AlertsUnitOfWork, parameters: ValidityParametersReader, clock: Clock) =>
        new RecalculateAlertsUseCase(uow, parameters, clock),
    },
    {
      provide: ListAlertsUseCase,
      inject: [RecalculateAlertsUseCase, ALERT_READER],
      useFactory: (recalculate: RecalculateAlertsUseCase, alerts: AlertRepository) =>
        new ListAlertsUseCase(recalculate, alerts),
    },
    {
      provide: GetAlertsSummaryUseCase,
      inject: [RecalculateAlertsUseCase, ALERT_READER],
      useFactory: (recalculate: RecalculateAlertsUseCase, alerts: AlertRepository) =>
        new GetAlertsSummaryUseCase(recalculate, alerts),
    },
    {
      provide: AcknowledgeAlertUseCase,
      inject: [ALERTS_UOW, CLOCK],
      useFactory: (uow: AlertsUnitOfWork, clock: Clock) => new AcknowledgeAlertUseCase(uow, clock),
    },
    AlertsDailyJob,
  ],
})
export class AlertsModule {}
