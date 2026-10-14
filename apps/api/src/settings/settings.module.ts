import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { DrizzleAuditLog } from '../audit/infrastructure/drizzle-audit-log'
import { DB } from '../infrastructure/database/database.module'
import { DrizzleUnitOfWork } from '../infrastructure/database/drizzle-unit-of-work'
import { GetGraphicResourceUseCase } from './application/get-graphic-resource.use-case'
import { GetParametersUseCase } from './application/get-parameters.use-case'
import { ListGraphicResourcesUseCase } from './application/list-graphic-resources.use-case'
import { SaveGraphicResourceUseCase } from './application/save-graphic-resource.use-case'
import { SaveParametersUseCase } from './application/save-parameters.use-case'
import type { SettingsUnitOfWork } from './domain/settings-unit-of-work'
import { RawImageBodyMiddleware } from './http/raw-image-body.middleware'
import { SettingsController } from './http/settings.controller'
import { DrizzleGraphicResourceRepository } from './infrastructure/drizzle-graphic-resource.repository'
import { DrizzleSystemParameterRepository } from './infrastructure/drizzle-system-parameter.repository'

const SETTINGS_UOW = Symbol('SETTINGS_UOW')

/** Parameters and credential images (W1-2, D3, D15, D18); see README.md. */
@Module({
  controllers: [SettingsController],
  providers: [
    {
      provide: SETTINGS_UOW,
      inject: [DB],
      useFactory: (db: Db) =>
        new DrizzleUnitOfWork(db, (tx) => ({
          parameters: new DrizzleSystemParameterRepository(tx),
          graphicResources: new DrizzleGraphicResourceRepository(tx),
          audit: new DrizzleAuditLog(tx),
        })),
    },
    {
      provide: GetParametersUseCase,
      inject: [DB],
      useFactory: (db: Db) => new GetParametersUseCase(new DrizzleSystemParameterRepository(db)),
    },
    {
      provide: SaveParametersUseCase,
      inject: [SETTINGS_UOW],
      useFactory: (uow: SettingsUnitOfWork) => new SaveParametersUseCase(uow),
    },
    {
      provide: ListGraphicResourcesUseCase,
      inject: [DB],
      useFactory: (db: Db) => new ListGraphicResourcesUseCase(new DrizzleGraphicResourceRepository(db)),
    },
    {
      provide: GetGraphicResourceUseCase,
      inject: [DB],
      useFactory: (db: Db) => new GetGraphicResourceUseCase(new DrizzleGraphicResourceRepository(db)),
    },
    {
      provide: SaveGraphicResourceUseCase,
      inject: [SETTINGS_UOW],
      useFactory: (uow: SettingsUnitOfWork) => new SaveGraphicResourceUseCase(uow),
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
