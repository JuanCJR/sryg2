import { PLACEHOLDER_SETTINGS } from '@sryg/types'
import { sql } from 'drizzle-orm'
import { createDb } from '../client'
import { parametroSistema } from '../schema'

export const TEST_DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg_test'

export function openTestDb() {
  return createDb(TEST_DATABASE_URL)
}

export type TestDb = ReturnType<typeof openTestDb>['db']

/**
 * Empties every application table so each test starts from a clean state. `parametro_sistema` is
 * emptied by the cascade from usuario, so its D3 placeholders (loaded by the migration) are restored.
 */
export async function truncateAll(db: TestDb) {
  await db.execute(sql`
    TRUNCATE auditoria, acceso_usuario, alerta, recurso_grafico,
      licencia_observacion, habilitacion_clase_aeronave, habilitacion_clase, habilitacion_tipo, licencia,
      certificado_observacion, certificado_medico, bloqueo, personal_adjunto, personal_aeronautico,
      catalog_license_type, catalog_type_rating, catalog_class_rating, catalog_aircraft, catalog_function,
      catalog_license_observation, catalog_medical_observation, catalog_document_type, catalog_attachment_type,
      catalog_nationality, usuario
    RESTART IDENTITY CASCADE
  `)
  await db
    .insert(parametroSistema)
    .values(Object.entries(PLACEHOLDER_SETTINGS).map(([key, value]) => ({ key, value, isPlaceholder: true })))
    .onConflictDoNothing()
}

/** Postgres error code of a failed query (drizzle wraps the driver error in `cause`). */
export async function pgErrorCode(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run()
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause
    return cause?.code ?? (error as { code?: string }).code
  }
  return undefined
}
