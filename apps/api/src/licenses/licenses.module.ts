import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import { Clock } from '../common/clock'
import { CredentialsCoreModule } from '../common/credentials/credentials-core.module'
import { ActiveBlocksRepository } from '../common/credentials/repositories/active-blocks.repository'
import { ValidityParametersRepository } from '../common/credentials/repositories/validity-parameters.repository'
import { DB } from '../common/database/database.module'
import { TransactionRunner } from '../common/database/transaction-runner'
import { LicensesController, PersonLicensesController } from './controllers/licenses.controller'
import type { LicensesTransaction } from './licenses.types'
import { LicenseQueryRepository } from './repositories/license-query.repository'
import { LicenseRepository } from './repositories/license.repository'
import { IssueLicenseService } from './services/issue-license.service'
import { LicenseQueriesService } from './services/license-queries.service'
import { ManageRatingsService } from './services/manage-ratings.service'
import { RenewLicenseService } from './services/renew-license.service'

const LICENSES_TRANSACTION = Symbol('LICENSES_TRANSACTION')

@Module({
  imports: [CredentialsCoreModule],
  controllers: [LicensesController, PersonLicensesController],
  providers: [
    Clock,
    {
      provide: LICENSES_TRANSACTION,
      inject: [DB],
      useFactory: (db: Db) =>
        new TransactionRunner(db, (tx) => ({
          store: new LicenseRepository(tx),
          reader: new LicenseQueryRepository(tx),
          audit: new AuditLogRepository(tx),
          blocks: new ActiveBlocksRepository(tx),
          validity: new ValidityParametersRepository(tx),
        })),
    },
    {
      provide: IssueLicenseService,
      inject: [LICENSES_TRANSACTION, Clock],
      useFactory: (transaction: LicensesTransaction, clock: Clock) => new IssueLicenseService(transaction, clock),
    },
    {
      provide: RenewLicenseService,
      inject: [LICENSES_TRANSACTION, Clock],
      useFactory: (transaction: LicensesTransaction, clock: Clock) => new RenewLicenseService(transaction, clock),
    },
    {
      provide: ManageRatingsService,
      inject: [LICENSES_TRANSACTION, Clock],
      useFactory: (transaction: LicensesTransaction, clock: Clock) => new ManageRatingsService(transaction, clock),
    },
    {
      provide: LicenseQueriesService,
      inject: [DB, ValidityParametersRepository, ActiveBlocksRepository, Clock],
      useFactory: (db: Db, validity: ValidityParametersRepository, blocks: ActiveBlocksRepository, clock: Clock) =>
        new LicenseQueriesService(new LicenseQueryRepository(db), new LicenseRepository(db), validity, blocks, clock),
    },
  ],
})
export class LicensesModule {}
