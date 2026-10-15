import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { DB } from '../database/database.module'
import { ActiveBlocksRepository } from './repositories/active-blocks.repository'
import { ValidityParametersRepository } from './repositories/validity-parameters.repository'

/**
 * Pool-backed repositories shared by licenses, medical certificates, alerts, reports, credentials and
 * public verification. Inside a transaction, build them on the transaction handle instead.
 */
@Module({
  providers: [
    {
      provide: ValidityParametersRepository,
      inject: [DB],
      useFactory: (db: Db) => new ValidityParametersRepository(db),
    },
    { provide: ActiveBlocksRepository, inject: [DB], useFactory: (db: Db) => new ActiveBlocksRepository(db) },
  ],
  exports: [ValidityParametersRepository, ActiveBlocksRepository],
})
export class CredentialsCoreModule {}
