import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Db } from '@sryg/db'
import { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import { Clock } from '../common/clock'
import type { Env } from '../common/config/env.schema'
import { ActiveBlocksRepository } from '../common/credentials/repositories/active-blocks.repository'
import { ValidityParametersRepository } from '../common/credentials/repositories/validity-parameters.repository'
import { DB } from '../common/database/database.module'
import { TransactionRunner } from '../common/database/transaction-runner'
import { CredentialsController } from './controllers/credentials.controller'
import type { CredentialsTransaction } from './credentials.types'
import { CardResourcesRepository } from './repositories/card-resources.repository'
import { CredentialCardRepository } from './repositories/credential-card.repository'
import { IssueCredentialPdfService } from './services/issue-credential-pdf.service'
import { PdfKitCredentialRenderer } from './services/pdfkit-credential-renderer'

const CREDENTIALS_TRANSACTION = Symbol('CREDENTIALS_TRANSACTION')

@Module({
  controllers: [CredentialsController],
  providers: [
    {
      provide: CREDENTIALS_TRANSACTION,
      inject: [DB],
      useFactory: (db: Db) =>
        new TransactionRunner(db, (tx) => ({
          cards: new CredentialCardRepository(tx),
          resources: new CardResourcesRepository(tx),
          blocks: new ActiveBlocksRepository(tx),
          validity: new ValidityParametersRepository(tx),
          audit: new AuditLogRepository(tx),
        })),
    },
    {
      provide: IssueCredentialPdfService,
      inject: [CREDENTIALS_TRANSACTION, ConfigService],
      // The QR opens the web app's /verificar page: the web origin is the first allowed CORS origin.
      useFactory: (transaction: CredentialsTransaction, config: ConfigService<Env, true>) =>
        new IssueCredentialPdfService(
          transaction,
          new PdfKitCredentialRenderer(),
          new Clock(),
          config.get('CORS_ORIGINS', { infer: true })[0]!,
        ),
    },
  ],
})
export class CredentialsModule {}
