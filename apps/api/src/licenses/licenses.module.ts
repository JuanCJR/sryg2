import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { DrizzleAuditLog } from '../audit/infrastructure/drizzle-audit-log'
import { DB } from '../infrastructure/database/database.module'
import { DrizzleUnitOfWork } from '../infrastructure/database/drizzle-unit-of-work'
import {
  ACTIVE_BLOCK_QUERY,
  CredentialsCoreModule,
  VALIDITY_PARAMETERS_READER,
} from '../shared/credentials/credentials-core.module'
import type { ActiveBlockQuery } from '../shared/credentials/domain/active-block-query'
import type { ValidityParametersReader } from '../shared/credentials/domain/validity-parameters-reader'
import { DrizzleActiveBlockQuery } from '../shared/credentials/infrastructure/drizzle-active-block-query'
import { DrizzleValidityParametersReader } from '../shared/credentials/infrastructure/drizzle-validity-parameters-reader'
import { IssueLicenseUseCase } from './application/issue-license.use-case'
import { LicenseQueriesUseCase } from './application/license-queries.use-case'
import { ManageRatingsUseCase } from './application/manage-ratings.use-case'
import { RenewLicenseUseCase } from './application/renew-license.use-case'
import { type Clock, SystemClock } from './domain/clock'
import type { LicensesUnitOfWork } from './domain/licenses-unit-of-work'
import { LicensesController, PersonLicensesController } from './http/licenses.controller'
import { DrizzleLicenseReader } from './infrastructure/drizzle-license.reader'
import { DrizzleLicenseStore } from './infrastructure/drizzle-license.store'

const LICENSES_UOW = Symbol('LICENSES_UOW')
const CLOCK = Symbol('CLOCK')

@Module({
  imports: [CredentialsCoreModule],
  controllers: [LicensesController, PersonLicensesController],
  providers: [
    { provide: CLOCK, useValue: new SystemClock() },
    {
      provide: LICENSES_UOW,
      inject: [DB],
      useFactory: (db: Db) =>
        new DrizzleUnitOfWork(db, (tx) => ({
          store: new DrizzleLicenseStore(tx),
          reader: new DrizzleLicenseReader(tx),
          audit: new DrizzleAuditLog(tx),
          blocks: new DrizzleActiveBlockQuery(tx),
          validity: new DrizzleValidityParametersReader(tx),
        })),
    },
    {
      provide: IssueLicenseUseCase,
      inject: [LICENSES_UOW, CLOCK],
      useFactory: (uow: LicensesUnitOfWork, clock: Clock) => new IssueLicenseUseCase(uow, clock),
    },
    {
      provide: RenewLicenseUseCase,
      inject: [LICENSES_UOW, CLOCK],
      useFactory: (uow: LicensesUnitOfWork, clock: Clock) => new RenewLicenseUseCase(uow, clock),
    },
    {
      provide: ManageRatingsUseCase,
      inject: [LICENSES_UOW, CLOCK],
      useFactory: (uow: LicensesUnitOfWork, clock: Clock) => new ManageRatingsUseCase(uow, clock),
    },
    {
      provide: LicenseQueriesUseCase,
      inject: [DB, VALIDITY_PARAMETERS_READER, ACTIVE_BLOCK_QUERY, CLOCK],
      useFactory: (db: Db, validity: ValidityParametersReader, blocks: ActiveBlockQuery, clock: Clock) =>
        new LicenseQueriesUseCase(new DrizzleLicenseReader(db), new DrizzleLicenseStore(db), validity, blocks, clock),
    },
  ],
})
export class LicensesModule {}
