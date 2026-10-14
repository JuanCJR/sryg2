import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { AuditModule } from '../audit/audit.module'
import { DrizzleAuditLog } from '../audit/infrastructure/drizzle-audit-log'
import { DB } from '../infrastructure/database/database.module'
import { DrizzleUnitOfWork } from '../infrastructure/database/drizzle-unit-of-work'
import { CreatePersonnelUseCase } from './application/create-personnel.use-case'
import { DeletePersonnelUseCase } from './application/delete-personnel.use-case'
import { GetPersonnelUseCase } from './application/get-personnel.use-case'
import { ListPersonnelUseCase } from './application/list-personnel.use-case'
import { GetPersonnelImageUseCase, SetPersonnelImageUseCase } from './application/personnel-images.use-cases'
import { UpdatePersonnelUseCase } from './application/update-personnel.use-case'
import type { PersonnelRepository } from './domain/personnel-repository'
import type { PersonnelUnitOfWork } from './domain/personnel-unit-of-work'
import { PersonnelController } from './http/personnel.controller'
import { DrizzleCatalogReferences } from './infrastructure/drizzle-catalog-references'
import { DrizzlePersonnelRepository } from './infrastructure/drizzle-personnel.repository'
import { SharpImageCompressor } from './infrastructure/sharp-image-compressor'

const PERSONNEL_READER = Symbol('PERSONNEL_READER')
const PERSONNEL_UOW = Symbol('PERSONNEL_UOW')

@Module({
  imports: [AuditModule],
  controllers: [PersonnelController],
  providers: [
    { provide: PERSONNEL_READER, inject: [DB], useFactory: (db: Db) => new DrizzlePersonnelRepository(db) },
    {
      provide: PERSONNEL_UOW,
      inject: [DB],
      useFactory: (db: Db) =>
        new DrizzleUnitOfWork(db, (tx) => ({
          personnel: new DrizzlePersonnelRepository(tx),
          audit: new DrizzleAuditLog(tx),
          catalogs: new DrizzleCatalogReferences(tx),
        })),
    },
    {
      provide: CreatePersonnelUseCase,
      inject: [PERSONNEL_UOW],
      useFactory: (uow: PersonnelUnitOfWork) => new CreatePersonnelUseCase(uow),
    },
    {
      provide: UpdatePersonnelUseCase,
      inject: [PERSONNEL_UOW],
      useFactory: (uow: PersonnelUnitOfWork) => new UpdatePersonnelUseCase(uow),
    },
    {
      provide: DeletePersonnelUseCase,
      inject: [PERSONNEL_UOW],
      useFactory: (uow: PersonnelUnitOfWork) => new DeletePersonnelUseCase(uow),
    },
    {
      provide: SetPersonnelImageUseCase,
      inject: [PERSONNEL_UOW],
      useFactory: (uow: PersonnelUnitOfWork) => new SetPersonnelImageUseCase(uow, new SharpImageCompressor()),
    },
    {
      provide: GetPersonnelImageUseCase,
      inject: [PERSONNEL_READER],
      useFactory: (repo: PersonnelRepository) => new GetPersonnelImageUseCase(repo),
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
