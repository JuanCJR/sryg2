import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { AuditModule } from '../audit/audit.module'
import { DrizzleAuditLog } from '../audit/infrastructure/drizzle-audit-log'
import { DB } from '../infrastructure/database/database.module'
import { DrizzleUnitOfWork } from '../infrastructure/database/drizzle-unit-of-work'
import { CreatePersonnelUseCase } from './application/create-personnel.use-case'
import { GetPersonnelUseCase } from './application/get-personnel.use-case'
import { ListPersonnelUseCase } from './application/list-personnel.use-case'
import { UpdatePersonnelUseCase } from './application/update-personnel.use-case'
import type { PersonnelRepository } from './domain/personnel-repository'
import type { PersonnelUnitOfWork } from './domain/personnel-unit-of-work'
import type { PersonnelWritePolicy } from './domain/write-policy'
import { PersonnelController } from './http/personnel.controller'
import { AllowAllWritePolicy } from './infrastructure/allow-all-write-policy'
import { DrizzlePersonnelRepository } from './infrastructure/drizzle-personnel.repository'

const PERSONNEL_READER = Symbol('PERSONNEL_READER')
const PERSONNEL_UOW = Symbol('PERSONNEL_UOW')
/** Override this provider to plug in RBAC (sryg-auth-rbac, AUTH-04). */
export const PERSONNEL_WRITE_POLICY = Symbol('PERSONNEL_WRITE_POLICY')

@Module({
  imports: [AuditModule],
  controllers: [PersonnelController],
  providers: [
    { provide: PERSONNEL_WRITE_POLICY, useClass: AllowAllWritePolicy },
    { provide: PERSONNEL_READER, inject: [DB], useFactory: (db: Db) => new DrizzlePersonnelRepository(db) },
    {
      provide: PERSONNEL_UOW,
      inject: [DB],
      useFactory: (db: Db) =>
        new DrizzleUnitOfWork(db, (tx) => ({
          personnel: new DrizzlePersonnelRepository(tx),
          audit: new DrizzleAuditLog(tx),
        })),
    },
    {
      provide: CreatePersonnelUseCase,
      inject: [PERSONNEL_UOW, PERSONNEL_WRITE_POLICY],
      useFactory: (uow: PersonnelUnitOfWork, policy: PersonnelWritePolicy) => new CreatePersonnelUseCase(uow, policy),
    },
    {
      provide: UpdatePersonnelUseCase,
      inject: [PERSONNEL_UOW, PERSONNEL_WRITE_POLICY],
      useFactory: (uow: PersonnelUnitOfWork, policy: PersonnelWritePolicy) => new UpdatePersonnelUseCase(uow, policy),
    },
    {
      provide: GetPersonnelUseCase,
      inject: [PERSONNEL_READER],
      useFactory: (repo: PersonnelRepository) => new GetPersonnelUseCase(repo),
    },
    {
      provide: ListPersonnelUseCase,
      inject: [PERSONNEL_READER],
      useFactory: (repo: PersonnelRepository) => new ListPersonnelUseCase(repo),
    },
  ],
})
export class PersonnelModule {}
