import { Module } from '@nestjs/common'
import { AlertsModule } from './alerts/alerts.module'
import { AuditModule } from './audit/audit.module'
import { AuthModule } from './auth/auth.module'
import { CatalogsModule } from './catalogs/catalogs.module'
import { ConfigModule } from './common/config/config.module'
import { DatabaseModule } from './common/database/database.module'
import { CredentialsModule } from './credentials/credentials.module'
import { HealthModule } from './health/health.module'
import { LicensesModule } from './licenses/licenses.module'
import { MedicalCertificatesModule } from './medical-certificates/medical-certificates.module'
import { PersonnelModule } from './personnel/personnel.module'
import { PublicVerifyModule } from './public-verify/public-verify.module'
import { ReportsModule } from './reports/reports.module'
import { SettingsModule } from './settings/settings.module'
import { UsersModule } from './users/users.module'
import { ValidationBlockingModule } from './validation-blocking/validation-blocking.module'

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
