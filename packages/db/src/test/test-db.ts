import { sql } from 'drizzle-orm'
import { createDb } from '../client'

export const TEST_DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg_test'

export function openTestDb() {
  return createDb(TEST_DATABASE_URL)
}

export type TestDb = ReturnType<typeof openTestDb>['db']

/** Empties every application table so each test starts from a clean state. */
export async function truncateAll(db: TestDb) {
  await db.execute(sql`
    TRUNCATE auditoria, habilitacion, licencia, certificado_medico, bloqueo, personal_aeronautico, usuario
    RESTART IDENTITY CASCADE
  `)
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
