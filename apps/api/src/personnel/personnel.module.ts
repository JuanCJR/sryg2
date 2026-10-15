import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { AuditModule } from '../audit/audit.module'
import { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import { DB } from '../common/database/database.module'
import { TransactionRunner } from '../common/database/transaction-runner'
import { PersonnelAttachmentsController } from './controllers/personnel-attachments.controller'
import { PersonnelController } from './controllers/personnel.controller'
import type { PersonnelTransaction } from './personnel.types'
import { AttachmentRepository } from './repositories/attachment.repository'
import { CatalogReferencesRepository } from './repositories/catalog-references.repository'
import { PersonnelRepository } from './repositories/personnel.repository'
import { CreatePersonnelService } from './services/create-personnel.service'
import { DeletePersonnelService } from './services/delete-personnel.service'
import { GetPersonnelService } from './services/get-personnel.service'
import { ListPersonnelService } from './services/list-personnel.service'
import { PersonnelAttachmentsService } from './services/personnel-attachments.service'
import { GetPersonnelImageService, SetPersonnelImageService } from './services/personnel-images.service'
import { SharpImageCompressor } from './services/sharp-image-compressor'
import { UpdatePersonnelService } from './services/update-personnel.service'

const PERSONNEL_TRANSACTION = Symbol('PERSONNEL_TRANSACTION')

@Module({
  imports: [AuditModule],
  controllers: [PersonnelController, PersonnelAttachmentsController],
  providers: [
    { provide: PersonnelRepository, inject: [DB], useFactory: (db: Db) => new PersonnelRepository(db) },
    {
      provide: PERSONNEL_TRANSACTION,
      inject: [DB],
      useFactory: (db: Db) =>
        new TransactionRunner(db, (tx) => ({
          personnel: new PersonnelRepository(tx),
          audit: new AuditLogRepository(tx),
          catalogs: new CatalogReferencesRepository(tx),
          attachments: new AttachmentRepository(tx),
        })),
    },
    {
      provide: CreatePersonnelService,
      inject: [PERSONNEL_TRANSACTION],
      useFactory: (transaction: PersonnelTransaction) => new CreatePersonnelService(transaction),
    },
    {
      provide: UpdatePersonnelService,
      inject: [PERSONNEL_TRANSACTION],
      useFactory: (transaction: PersonnelTransaction) => new UpdatePersonnelService(transaction),
    },
    {
      provide: DeletePersonnelService,
      inject: [PERSONNEL_TRANSACTION],
      useFactory: (transaction: PersonnelTransaction) => new DeletePersonnelService(transaction),
    },
    {
      provide: SetPersonnelImageService,
      inject: [PERSONNEL_TRANSACTION],
      useFactory: (transaction: PersonnelTransaction) =>
        new SetPersonnelImageService(transaction, new SharpImageCompressor()),
    },
    {
      provide: GetPersonnelImageService,
      inject: [PersonnelRepository],
      useFactory: (repo: PersonnelRepository) => new GetPersonnelImageService(repo),
    },
    {
      provide: PersonnelAttachmentsService,
      inject: [PERSONNEL_TRANSACTION],
      useFactory: (transaction: PersonnelTransaction) => new PersonnelAttachmentsService(transaction),
    },
    {
      provide: GetPersonnelService,
      inject: [PersonnelRepository],
      useFactory: (repo: PersonnelRepository) => new GetPersonnelService(repo),
    },
    {
      provide: ListPersonnelService,
      inject: [PersonnelRepository],
      useFactory: (repo: PersonnelRepository) => new ListPersonnelService(repo),
    },
  ],
})
export class PersonnelModule {}
