import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from './test/create-test-app'

// Feature modules of the parallel plan (F0-A): each wave-1 branch only fills its own folder.
const FEATURE_MODULES = [
  ['./users/users.module', 'UsersModule'],
  ['./settings/settings.module', 'SettingsModule'],
  ['./catalogs/catalogs.module', 'CatalogsModule'],
  ['./validation-blocking/validation-blocking.module', 'ValidationBlockingModule'],
  ['./licenses/licenses.module', 'LicensesModule'],
  ['./medical-certificates/medical-certificates.module', 'MedicalCertificatesModule'],
  ['./audit/audit.module', 'AuditModule'],
  ['./reports/reports.module', 'ReportsModule'],
  ['./alerts/alerts.module', 'AlertsModule'],
  ['./credentials/credentials.module', 'CredentialsModule'],
  ['./public-verify/public-verify.module', 'PublicVerifyModule'],
] as const

describe('AppModule', () => {
  let app: INestApplication
  beforeAll(async () => {
    app = await createTestApp()
  })
  afterAll(() => app.close())

  it.each(FEATURE_MODULES)('registers %s', async (path, name) => {
    // Imported after createTestApp so the class is the instance AppModule registered.
    const module = (await import(path)) as Record<string, new () => unknown>
    expect(() => app.select(module[name]!)).not.toThrow()
  })
})
