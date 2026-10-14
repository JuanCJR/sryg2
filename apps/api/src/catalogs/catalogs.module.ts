import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { DrizzleAuditLog } from '../audit/infrastructure/drizzle-audit-log'
import { DB } from '../infrastructure/database/database.module'
import { DrizzleUnitOfWork } from '../infrastructure/database/drizzle-unit-of-work'
import { CreateCatalogItemUseCase } from './application/create-catalog-item.use-case'
import { DeleteCatalogItemUseCase } from './application/delete-catalog-item.use-case'
import { ListCatalogItemsUseCase } from './application/list-catalog-items.use-case'
import { ListCatalogOptionsUseCase } from './application/list-catalog-options.use-case'
import { UpdateCatalogItemUseCase } from './application/update-catalog-item.use-case'
import type { CatalogItemRepository } from './domain/catalog-item-repository'
import type { CatalogOptionsReader } from './domain/catalog-options-reader'
import type { CatalogUnitOfWork } from './domain/catalog-unit-of-work'
import { CatalogItemsController } from './http/catalog-items.controller'
import { CatalogsController } from './http/catalogs.controller'
import { DrizzleCatalogItemRepository } from './infrastructure/drizzle-catalog-item.repository'
import { DrizzleCatalogOptionsReader } from './infrastructure/drizzle-catalog-options.reader'

const CATALOG_OPTIONS_READER = Symbol('CATALOG_OPTIONS_READER')
const CATALOG_ITEM_READER = Symbol('CATALOG_ITEM_READER')
const CATALOG_UOW = Symbol('CATALOG_UOW')

@Module({
  // The options controller goes first so `:catalog/options` never reaches the maintenance routes.
  controllers: [CatalogsController, CatalogItemsController],
  providers: [
    { provide: CATALOG_OPTIONS_READER, inject: [DB], useFactory: (db: Db) => new DrizzleCatalogOptionsReader(db) },
    {
      provide: ListCatalogOptionsUseCase,
      inject: [CATALOG_OPTIONS_READER],
      useFactory: (reader: CatalogOptionsReader) => new ListCatalogOptionsUseCase(reader),
    },
    { provide: CATALOG_ITEM_READER, inject: [DB], useFactory: (db: Db) => new DrizzleCatalogItemRepository(db) },
    {
      provide: CATALOG_UOW,
      inject: [DB],
      useFactory: (db: Db) =>
        new DrizzleUnitOfWork(db, (tx) => ({
          items: new DrizzleCatalogItemRepository(tx),
          audit: new DrizzleAuditLog(tx),
        })),
    },
    {
      provide: ListCatalogItemsUseCase,
      inject: [CATALOG_ITEM_READER],
      useFactory: (repo: CatalogItemRepository) => new ListCatalogItemsUseCase(repo),
    },
    {
      provide: CreateCatalogItemUseCase,
      inject: [CATALOG_UOW],
      useFactory: (uow: CatalogUnitOfWork) => new CreateCatalogItemUseCase(uow),
    },
    {
      provide: UpdateCatalogItemUseCase,
      inject: [CATALOG_UOW],
      useFactory: (uow: CatalogUnitOfWork) => new UpdateCatalogItemUseCase(uow),
    },
    {
      provide: DeleteCatalogItemUseCase,
      inject: [CATALOG_UOW],
      useFactory: (uow: CatalogUnitOfWork) => new DeleteCatalogItemUseCase(uow),
    },
  ],
})
export class CatalogsModule {}
