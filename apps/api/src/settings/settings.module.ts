import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import { DB } from '../common/database/database.module'
import { TransactionRunner } from '../common/database/transaction-runner'
import { RawImageBodyMiddleware } from './controllers/raw-image-body.middleware'
import { SettingsController } from './controllers/settings.controller'
import { GraphicResourceRepository } from './repositories/graphic-resource.repository'
import { SystemParameterRepository } from './repositories/system-parameter.repository'
import { GetGraphicResourceService } from './services/get-graphic-resource.service'
import { GetParametersService } from './services/get-parameters.service'
import { ListGraphicResourcesService } from './services/list-graphic-resources.service'
import { SaveGraphicResourceService } from './services/save-graphic-resource.service'
import { SaveParametersService } from './services/save-parameters.service'
import type { SettingsTransaction } from './settings.types'

const SETTINGS_TRANSACTION = Symbol('SETTINGS_TRANSACTION')

/** Parameters and credential images (W1-2, D3, D15, D18); see README.md. */
@Module({
  controllers: [SettingsController],
  providers: [
    {
      provide: SETTINGS_TRANSACTION,
      inject: [DB],
      useFactory: (db: Db) =>
        new TransactionRunner(db, (tx) => ({
          parameters: new SystemParameterRepository(tx),
          graphicResources: new GraphicResourceRepository(tx),
          audit: new AuditLogRepository(tx),
        })),
    },
    {
      provide: GetParametersService,
      inject: [DB],
      useFactory: (db: Db) => new GetParametersService(new SystemParameterRepository(db)),
    },
    {
      provide: SaveParametersService,
      inject: [SETTINGS_TRANSACTION],
      useFactory: (transaction: SettingsTransaction) => new SaveParametersService(transaction),
    },
    {
      provide: ListGraphicResourcesService,
      inject: [DB],
      useFactory: (db: Db) => new ListGraphicResourcesService(new GraphicResourceRepository(db)),
    },
    {
      provide: GetGraphicResourceService,
      inject: [DB],
      useFactory: (db: Db) => new GetGraphicResourceService(new GraphicResourceRepository(db)),
    },
    {
      provide: SaveGraphicResourceService,
      inject: [SETTINGS_TRANSACTION],
      useFactory: (transaction: SettingsTransaction) => new SaveGraphicResourceService(transaction),
    },
  ],
})
export class SettingsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RawImageBodyMiddleware)
      .forRoutes({ path: 'settings/graphic-resources/:kind', method: RequestMethod.PUT })
  }
}
