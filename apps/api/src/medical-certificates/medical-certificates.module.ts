import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import { Clock } from '../common/clock'
import { CredentialsCoreModule } from '../common/credentials/credentials-core.module'
import { ActiveBlocksRepository } from '../common/credentials/repositories/active-blocks.repository'
import { ValidityParametersRepository } from '../common/credentials/repositories/validity-parameters.repository'
import { DB } from '../common/database/database.module'
import { TransactionRunner } from '../common/database/transaction-runner'
import {
  MedicalCertificatesController,
  PersonMedicalCertificatesController,
} from './controllers/medical-certificates.controller'
import type { MedicalCertificatesTransaction } from './medical-certificates.types'
import { MedicalCertificateHistoryRepository } from './repositories/medical-certificate-history.repository'
import {
  HolderLookup,
  MedicalCertificateRepository,
  MedicalObservationCatalog,
} from './repositories/medical-certificate.repository'
import {
  GetMedicalCertificateHistoryService,
  GetMedicalCertificateService,
  GetMedicalValidityService,
  ListPersonMedicalCertificatesService,
  type MedicalCertificateReaders,
} from './services/read-medical-certificates.service'
import { RegisterMedicalCertificateService } from './services/register-medical-certificate.service'
import { RenewMedicalCertificateService } from './services/renew-medical-certificate.service'

const READERS = Symbol('MEDICAL_CERTIFICATE_READERS')
const MEDICAL_CERTIFICATES_TRANSACTION = Symbol('MEDICAL_CERTIFICATES_TRANSACTION')

@Module({
  imports: [CredentialsCoreModule],
  controllers: [PersonMedicalCertificatesController, MedicalCertificatesController],
  providers: [
    Clock,
    {
      provide: READERS,
      inject: [DB, ActiveBlocksRepository, ValidityParametersRepository, Clock],
      useFactory: (
        db: Db,
        blocks: ActiveBlocksRepository,
        validity: ValidityParametersRepository,
        clock: Clock,
      ): MedicalCertificateReaders => ({
        certificates: new MedicalCertificateRepository(db),
        holders: new HolderLookup(db),
        blocks,
        validity,
        clock,
      }),
    },
    {
      provide: MEDICAL_CERTIFICATES_TRANSACTION,
      inject: [DB],
      useFactory: (db: Db) =>
        new TransactionRunner(db, (tx) => ({
          certificates: new MedicalCertificateRepository(tx),
          observations: new MedicalObservationCatalog(tx),
          holders: new HolderLookup(tx),
          blocks: new ActiveBlocksRepository(tx),
          validity: new ValidityParametersRepository(tx),
          audit: new AuditLogRepository(tx),
        })),
    },
    {
      provide: RegisterMedicalCertificateService,
      inject: [MEDICAL_CERTIFICATES_TRANSACTION, Clock],
      useFactory: (transaction: MedicalCertificatesTransaction, clock: Clock) =>
        new RegisterMedicalCertificateService(transaction, clock),
    },
    {
      provide: RenewMedicalCertificateService,
      inject: [MEDICAL_CERTIFICATES_TRANSACTION, Clock],
      useFactory: (transaction: MedicalCertificatesTransaction, clock: Clock) => new RenewMedicalCertificateService(transaction, clock),
    },
    {
      provide: ListPersonMedicalCertificatesService,
      inject: [READERS],
      useFactory: (readers: MedicalCertificateReaders) => new ListPersonMedicalCertificatesService(readers),
    },
    {
      provide: GetMedicalCertificateService,
      inject: [READERS],
      useFactory: (readers: MedicalCertificateReaders) => new GetMedicalCertificateService(readers),
    },
    {
      provide: GetMedicalValidityService,
      inject: [ValidityParametersRepository],
      useFactory: (validity: ValidityParametersRepository) => new GetMedicalValidityService(validity),
    },
    {
      provide: GetMedicalCertificateHistoryService,
      inject: [DB],
      useFactory: (db: Db) =>
        new GetMedicalCertificateHistoryService(
          new MedicalCertificateRepository(db),
          new MedicalCertificateHistoryRepository(db),
        ),
    },
  ],
})
export class MedicalCertificatesModule {}
