import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import { DB } from '../common/database/database.module'
import { TransactionRunner } from '../common/database/transaction-runner'
import type { CatalogTransaction } from './catalogs.types'
import { CatalogItemsController } from './controllers/catalog-items.controller'
import { CatalogsController } from './controllers/catalogs.controller'
import { CatalogItemRepository } from './repositories/catalog-item.repository'
import { CatalogOptionsRepository } from './repositories/catalog-options.repository'
import { CreateCatalogItemService } from './services/create-catalog-item.service'
import { DeleteCatalogItemService } from './services/delete-catalog-item.service'
import { ListCatalogItemsService } from './services/list-catalog-items.service'
import { ListCatalogOptionsService } from './services/list-catalog-options.service'
import { UpdateCatalogItemService } from './services/update-catalog-item.service'

const CATALOG_TRANSACTION = Symbol('CATALOG_TRANSACTION')

@Module({
  // The options controller goes first so `:catalog/options` never reaches the maintenance routes.
  controllers: [CatalogsController, CatalogItemsController],
  providers: [
    { provide: CatalogOptionsRepository, inject: [DB], useFactory: (db: Db) => new CatalogOptionsRepository(db) },
    {
      provide: ListCatalogOptionsService,
      inject: [CatalogOptionsRepository],
      useFactory: (reader: CatalogOptionsRepository) => new ListCatalogOptionsService(reader),
    },
    { provide: CatalogItemRepository, inject: [DB], useFactory: (db: Db) => new CatalogItemRepository(db) },
    {
      provide: CATALOG_TRANSACTION,
      inject: [DB],
      useFactory: (db: Db) =>
        new TransactionRunner(db, (tx) => ({
          items: new CatalogItemRepository(tx),
          audit: new AuditLogRepository(tx),
        })),
    },
    {
      provide: ListCatalogItemsService,
      inject: [CatalogItemRepository],
      useFactory: (repo: CatalogItemRepository) => new ListCatalogItemsService(repo),
    },
    {
      provide: CreateCatalogItemService,
      inject: [CATALOG_TRANSACTION],
      useFactory: (transaction: CatalogTransaction) => new CreateCatalogItemService(transaction),
    },
    {
      provide: UpdateCatalogItemService,
      inject: [CATALOG_TRANSACTION],
      useFactory: (transaction: CatalogTransaction) => new UpdateCatalogItemService(transaction),
    },
    {
      provide: DeleteCatalogItemService,
      inject: [CATALOG_TRANSACTION],
      useFactory: (transaction: CatalogTransaction) => new DeleteCatalogItemService(transaction),
    },
  ],
})
export class CatalogsModule {}
