import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { DB } from '../infrastructure/database/database.module'
import { ListCatalogOptionsUseCase } from './application/list-catalog-options.use-case'
import type { CatalogOptionsReader } from './domain/catalog-options-reader'
import { CatalogsController } from './http/catalogs.controller'
import { DrizzleCatalogOptionsReader } from './infrastructure/drizzle-catalog-options.reader'

const CATALOG_OPTIONS_READER = Symbol('CATALOG_OPTIONS_READER')

@Module({
  controllers: [CatalogsController],
  providers: [
    { provide: CATALOG_OPTIONS_READER, inject: [DB], useFactory: (db: Db) => new DrizzleCatalogOptionsReader(db) },
    {
      provide: ListCatalogOptionsUseCase,
      inject: [CATALOG_OPTIONS_READER],
      useFactory: (reader: CatalogOptionsReader) => new ListCatalogOptionsUseCase(reader),
    },
  ],
})
export class CatalogsModule {}
