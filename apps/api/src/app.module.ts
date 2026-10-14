import { Module } from '@nestjs/common'
import { ConfigModule } from './config/config.module'
import { AuthModule } from './auth/auth.module'
import { PersonnelModule } from './personnel/personnel.module'
import { CatalogsModule } from './catalogs/catalogs.module'
import { UsersModule } from './users/users.module'
import { SettingsModule } from './settings/settings.module'
import { ValidationBlockingModule } from './validation-blocking/validation-blocking.module'
import { LicensesModule } from './licenses/licenses.module'
import { MedicalCertificatesModule } from './medical-certificates/medical-certificates.module'
import { AuditModule } from './audit/audit.module'
import { ReportsModule } from './reports/reports.module'
import { AlertsModule } from './alerts/alerts.module'
import { CredentialsModule } from './credentials/credentials.module'
import { PublicVerifyModule } from './public-verify/public-verify.module'
import { HealthModule } from './health/health.module'
import { DatabaseModule } from './infrastructure/database/database.module'

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuthModule,
    PersonnelModule,
    CatalogsModule,
    UsersModule,
    SettingsModule,
    ValidationBlockingModule,
    LicensesModule,
    MedicalCertificatesModule,
    AuditModule,
    ReportsModule,
    AlertsModule,
    CredentialsModule,
    PublicVerifyModule,
    HealthModule,
  ],
})
export class AppModule {}
