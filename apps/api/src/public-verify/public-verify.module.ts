import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { Clock } from '../common/clock'
import { CredentialsCoreModule } from '../common/credentials/credentials-core.module'
import { ActiveBlocksRepository } from '../common/credentials/repositories/active-blocks.repository'
import { ValidityParametersRepository } from '../common/credentials/repositories/validity-parameters.repository'
import { DB } from '../common/database/database.module'
import { PublicVerifyController } from './controllers/public-verify.controller'
import { VerificationRepository } from './repositories/verification.repository'
import { VerifyCredentialService } from './services/verify-credential.service'

@Module({
  imports: [CredentialsCoreModule],
  controllers: [PublicVerifyController],
  providers: [
    {
      provide: VerifyCredentialService,
      inject: [DB, ActiveBlocksRepository, ValidityParametersRepository],
      useFactory: (db: Db, blocks: ActiveBlocksRepository, validity: ValidityParametersRepository) =>
        new VerifyCredentialService(new VerificationRepository(db), blocks, validity, new Clock()),
    },
  ],
})
export class PublicVerifyModule {}
