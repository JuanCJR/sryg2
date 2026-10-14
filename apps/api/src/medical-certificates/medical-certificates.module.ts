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
import {
  GetMedicalCertificateHistoryUseCase,
  GetMedicalCertificateUseCase,
  GetMedicalValidityUseCase,
  ListPersonMedicalCertificatesUseCase,
  type MedicalCertificateReaders,
} from './application/read-medical-certificates.use-cases'
import { RegisterMedicalCertificateUseCase } from './application/register-medical-certificate.use-case'
import { RenewMedicalCertificateUseCase } from './application/renew-medical-certificate.use-case'
import type { Clock } from './domain/clock'
import type { MedicalCertificatesUnitOfWork } from './domain/medical-certificates-unit-of-work'
import {
  MedicalCertificatesController,
  PersonMedicalCertificatesController,
} from './http/medical-certificates.controller'
import { DrizzleMedicalCertificateHistoryReader } from './infrastructure/drizzle-medical-certificate-history.reader'
import {
  DrizzleHolderLookup,
  DrizzleMedicalCertificateRepository,
  DrizzleMedicalObservationCatalog,
} from './infrastructure/drizzle-medical-certificate.repository'
import { SystemClock } from './infrastructure/system-clock'

const READERS = Symbol('MEDICAL_CERTIFICATE_READERS')
const UOW = Symbol('MEDICAL_CERTIFICATES_UOW')
const CLOCK = Symbol('CLOCK')

@Module({
  imports: [CredentialsCoreModule],
  controllers: [PersonMedicalCertificatesController, MedicalCertificatesController],
  providers: [
    { provide: CLOCK, useValue: new SystemClock() },
    {
      provide: READERS,
      inject: [DB, ACTIVE_BLOCK_QUERY, VALIDITY_PARAMETERS_READER, CLOCK],
      useFactory: (
        db: Db,
        blocks: ActiveBlockQuery,
        validity: ValidityParametersReader,
        clock: Clock,
      ): MedicalCertificateReaders => ({
        certificates: new DrizzleMedicalCertificateRepository(db),
        holders: new DrizzleHolderLookup(db),
        blocks,
        validity,
        clock,
      }),
    },
    {
      provide: UOW,
      inject: [DB],
      useFactory: (db: Db) =>
        new DrizzleUnitOfWork(db, (tx) => ({
          certificates: new DrizzleMedicalCertificateRepository(tx),
          observations: new DrizzleMedicalObservationCatalog(tx),
          holders: new DrizzleHolderLookup(tx),
          blocks: new DrizzleActiveBlockQuery(tx),
          validity: new DrizzleValidityParametersReader(tx),
          audit: new DrizzleAuditLog(tx),
        })),
    },
    {
      provide: RegisterMedicalCertificateUseCase,
      inject: [UOW, CLOCK],
      useFactory: (uow: MedicalCertificatesUnitOfWork, clock: Clock) =>
        new RegisterMedicalCertificateUseCase(uow, clock),
    },
    {
      provide: RenewMedicalCertificateUseCase,
      inject: [UOW, CLOCK],
      useFactory: (uow: MedicalCertificatesUnitOfWork, clock: Clock) => new RenewMedicalCertificateUseCase(uow, clock),
    },
    {
      provide: ListPersonMedicalCertificatesUseCase,
      inject: [READERS],
      useFactory: (readers: MedicalCertificateReaders) => new ListPersonMedicalCertificatesUseCase(readers),
    },
    {
      provide: GetMedicalCertificateUseCase,
      inject: [READERS],
      useFactory: (readers: MedicalCertificateReaders) => new GetMedicalCertificateUseCase(readers),
    },
    {
      provide: GetMedicalValidityUseCase,
      inject: [VALIDITY_PARAMETERS_READER],
      useFactory: (validity: ValidityParametersReader) => new GetMedicalValidityUseCase(validity),
    },
    {
      provide: GetMedicalCertificateHistoryUseCase,
      inject: [DB],
      useFactory: (db: Db) =>
        new GetMedicalCertificateHistoryUseCase(
          new DrizzleMedicalCertificateRepository(db),
          new DrizzleMedicalCertificateHistoryReader(db),
        ),
    },
  ],
})
export class MedicalCertificatesModule {}
