import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Db } from '@sryg/db'
import { DrizzleAuditLog } from '../audit/infrastructure/drizzle-audit-log'
import type { Env } from '../config/env.schema'
import { DB } from '../infrastructure/database/database.module'
import { DrizzleUnitOfWork } from '../infrastructure/database/drizzle-unit-of-work'
import { DrizzleActiveBlockQuery } from '../shared/credentials/infrastructure/drizzle-active-block-query'
import { DrizzleValidityParametersReader } from '../shared/credentials/infrastructure/drizzle-validity-parameters-reader'
import { IssueCredentialPdfUseCase } from './application/issue-credential-pdf.use-case'
import { SystemClock } from './domain/clock'
import type { CredentialsUnitOfWork } from './domain/credentials-unit-of-work'
import { CredentialsController } from './http/credentials.controller'
import { DrizzleCardResourcesReader } from './infrastructure/drizzle-card-resources.reader'
import { DrizzleCredentialCardReader } from './infrastructure/drizzle-credential-card.reader'
import { PdfKitCredentialRenderer } from './infrastructure/pdfkit-credential-renderer'

const CREDENTIALS_UOW = Symbol('CREDENTIALS_UOW')

@Module({
  controllers: [CredentialsController],
  providers: [
    {
      provide: CREDENTIALS_UOW,
      inject: [DB],
      useFactory: (db: Db) =>
        new DrizzleUnitOfWork(db, (tx) => ({
          cards: new DrizzleCredentialCardReader(tx),
          resources: new DrizzleCardResourcesReader(tx),
          blocks: new DrizzleActiveBlockQuery(tx),
          validity: new DrizzleValidityParametersReader(tx),
          audit: new DrizzleAuditLog(tx),
        })),
    },
    {
      provide: IssueCredentialPdfUseCase,
      inject: [CREDENTIALS_UOW, ConfigService],
      // The QR opens the web app's /verificar page: the web origin is the first allowed CORS origin.
      useFactory: (uow: CredentialsUnitOfWork, config: ConfigService<Env, true>) =>
        new IssueCredentialPdfUseCase(
          uow,
          new PdfKitCredentialRenderer(),
          new SystemClock(),
          config.get('CORS_ORIGINS', { infer: true })[0]!,
        ),
    },
  ],
})
export class CredentialsModule {}
