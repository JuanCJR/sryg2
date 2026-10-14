import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { DB } from '../../infrastructure/database/database.module'
import { DrizzleActiveBlockQuery } from './infrastructure/drizzle-active-block-query'
import { DrizzleValidityParametersReader } from './infrastructure/drizzle-validity-parameters-reader'

/** Inject as `ValidityParametersReader` (./domain). */
export const VALIDITY_PARAMETERS_READER = Symbol('VALIDITY_PARAMETERS_READER')
/** Inject as `ActiveBlockQuery` (./domain). */
export const ACTIVE_BLOCK_QUERY = Symbol('ACTIVE_BLOCK_QUERY')

/**
 * Pool-backed adapters shared by licenses, medical certificates, alerts, reports, credentials and
 * public verification. Inside a unit of work, build the Drizzle adapters on the transaction handle.
 */
@Module({
  providers: [
    {
      provide: VALIDITY_PARAMETERS_READER,
      inject: [DB],
      useFactory: (db: Db) => new DrizzleValidityParametersReader(db),
    },
    { provide: ACTIVE_BLOCK_QUERY, inject: [DB], useFactory: (db: Db) => new DrizzleActiveBlockQuery(db) },
  ],
  exports: [VALIDITY_PARAMETERS_READER, ACTIVE_BLOCK_QUERY],
})
export class CredentialsCoreModule {}
