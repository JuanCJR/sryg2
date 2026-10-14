import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { auditoria } from './schema'
import { openTestDb, pgErrorCode, truncateAll } from './test/test-db'

const { db, pool } = openTestDb()
const RAISE_EXCEPTION = 'P0001'

async function insertEntry() {
  const [row] = await db
    .insert(auditoria)
    .values({ action: 'crear', entity: 'personal_aeronautico', changes: { after: { cedula: '12345678' } } })
    .returning()
  return row!
}

beforeEach(() => truncateAll(db))
afterAll(() => pool.end())

describe('auditoria immutability (NFR-04)', () => {
  it('allows inserts', async () => {
    const row = await insertEntry()
    expect(row.id).toBeGreaterThan(0)
  })

  it('rejects UPDATE', async () => {
    const row = await insertEntry()
    const code = await pgErrorCode(() => db.update(auditoria).set({ entity: 'x' }).where(eq(auditoria.id, row.id)))
    expect(code).toBe(RAISE_EXCEPTION)
  })

  it('rejects DELETE', async () => {
    const row = await insertEntry()
    const code = await pgErrorCode(() => db.delete(auditoria).where(eq(auditoria.id, row.id)))
    expect(code).toBe(RAISE_EXCEPTION)
  })
})
