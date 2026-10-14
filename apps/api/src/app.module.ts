import { Module } from '@nestjs/common'
import { ConfigModule } from './config/config.module'
import { AuthModule } from './auth/auth.module'
import { PersonnelModule } from './personnel/personnel.module'
import { CatalogsModule } from './catalogs/catalogs.module'
import { HealthModule } from './health/health.module'
import { DatabaseModule } from './infrastructure/database/database.module'

@Module({ imports: [ConfigModule, DatabaseModule, AuthModule, PersonnelModule, CatalogsModule, HealthModule] })
export class AppModule {}
