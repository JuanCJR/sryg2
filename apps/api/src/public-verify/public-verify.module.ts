import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { DB } from '../infrastructure/database/database.module'
import {
  ACTIVE_BLOCK_QUERY,
  CredentialsCoreModule,
  VALIDITY_PARAMETERS_READER,
} from '../shared/credentials/credentials-core.module'
import type { ActiveBlockQuery } from '../shared/credentials/domain/active-block-query'
import type { ValidityParametersReader } from '../shared/credentials/domain/validity-parameters-reader'
import { VerifyCredentialUseCase } from './application/verify-credential.use-case'
import { SystemClock } from './domain/clock'
import { PublicVerifyController } from './http/public-verify.controller'
import { DrizzleVerificationReader } from './infrastructure/drizzle-verification.reader'

@Module({
  imports: [CredentialsCoreModule],
  controllers: [PublicVerifyController],
  providers: [
    {
      provide: VerifyCredentialUseCase,
      inject: [DB, ACTIVE_BLOCK_QUERY, VALIDITY_PARAMETERS_READER],
      useFactory: (db: Db, blocks: ActiveBlockQuery, validity: ValidityParametersReader) =>
        new VerifyCredentialUseCase(new DrizzleVerificationReader(db), blocks, validity, new SystemClock()),
    },
  ],
})
export class PublicVerifyModule {}
