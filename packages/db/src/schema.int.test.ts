import { eq, getTableColumns, sql } from 'drizzle-orm'
import { getTableName } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { bloqueo, certificadoMedico, habilitacion, licencia, personalAeronautico, usuario } from './schema'
import { openTestDb, pgErrorCode, truncateAll } from './test/test-db'

const { db, pool } = openTestDb()

const FK_VIOLATION = '23503'
const UNIQUE_VIOLATION = '23505'
const CHECK_VIOLATION = '23514'

async function seedUser(email = 'admin@sryg.test') {
  const [row] = await db
    .insert(usuario)
    .values({ email, fullName: 'Admin', role: 'administrador', passwordHash: 'hash' })
    .returning()
  return row!
}

async function seedPersonal(userId: string, cedula = '12345678') {
  const [row] = await db
    .insert(personalAeronautico)
    .values({ cedula, fullName: 'Ana Perez', createdBy: userId, updatedBy: userId })
    .returning()
  return row!
}

beforeEach(() => truncateAll(db))
afterAll(() => pool.end())

describe('schema', () => {
  it('creates the 7 tables', async () => {
    const result = await db.execute<{ table_name: string }>(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> '__drizzle_migrations'`,
    )
    expect(result.rows.map((r) => r.table_name).sort()).toEqual(
      [
        'auditoria',
        'bloqueo',
        'certificado_medico',
        'habilitacion',
        'licencia',
        'personal_aeronautico',
        'usuario',
      ].sort(),
    )
  })

  it('keeps certificado_medico free of clinical columns (BR-05)', () => {
    expect(Object.keys(getTableColumns(certificadoMedico)).sort()).toEqual(
      [
        'createdAt',
        'expiryDate',
        'id',
        'issueDate',
        'personalId',
        'rav67Class',
        'restrictions',
        'status',
        'updatedAt',
      ].sort(),
    )
    expect(getTableName(certificadoMedico)).toBe('certificado_medico')
  })
})

describe('referential integrity', () => {
  it('rejects a licencia for a nonexistent personal', async () => {
    const code = await pgErrorCode(() =>
      db.insert(licencia).values({
        personalId: '00000000-0000-0000-0000-000000000000',
        rav60Category: 'piloto_privado',
        issueDate: '2024-01-01',
        expiryDate: '2025-01-01',
      }),
    )
    expect(code).toBe(FK_VIOLATION)
  })

  it('rejects deleting a personal that still has credentials (RESTRICT)', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    await db.insert(certificadoMedico).values({
      personalId: personal.id,
      rav67Class: 'clase_1',
      issueDate: '2024-01-01',
      expiryDate: '2025-01-01',
    })
    const code = await pgErrorCode(() => db.delete(personalAeronautico).where(eq(personalAeronautico.id, personal.id)))
    expect(code).toBe(FK_VIOLATION)
  })

  it('rejects deleting a licencia that still has habilitaciones (RESTRICT)', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    const [lic] = await db
      .insert(licencia)
      .values({
        personalId: personal.id,
        rav60Category: 'piloto_comercial',
        issueDate: '2024-01-01',
        expiryDate: '2026-01-01',
      })
      .returning()
    await db
      .insert(habilitacion)
      .values({ licenciaId: lic!.id, type: 'IFR', issueDate: '2024-01-01', expiryDate: '2025-01-01' })
    const code = await pgErrorCode(() => db.delete(licencia).where(eq(licencia.id, lic!.id)))
    expect(code).toBe(FK_VIOLATION)
  })
})

describe('uniqueness', () => {
  it('rejects two personal with the same cedula', async () => {
    const user = await seedUser()
    await seedPersonal(user.id, '12345678')
    expect(await pgErrorCode(() => seedPersonal(user.id, '12345678'))).toBe(UNIQUE_VIOLATION)
  })

  it('enforces unique email case-insensitively (lower(email))', async () => {
    await seedUser('Admin@Sryg.test')
    expect(await pgErrorCode(() => seedUser('admin@sryg.TEST'))).toBe(UNIQUE_VIOLATION)
  })
})

describe('check constraints', () => {
  it.each(['12345', '1234567890', 'V-12345678', 'abcdefgh'])('rejects cedula %j', async (cedula) => {
    const user = await seedUser()
    expect(await pgErrorCode(() => seedPersonal(user.id, cedula))).toBe(CHECK_VIOLATION)
  })

  it('requires expiry_date after issue_date on certificado_medico', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    const code = await pgErrorCode(() =>
      db.insert(certificadoMedico).values({
        personalId: personal.id,
        rav67Class: 'clase_2',
        issueDate: '2025-01-01',
        expiryDate: '2024-01-01',
      }),
    )
    expect(code).toBe(CHECK_VIOLATION)
  })

  it('requires resolver data exactly when a bloqueo is resolved', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    const base = { personalId: personal.id, type: 'administrativo', reason: 'Docs', createdBy: user.id } as const
    expect(await pgErrorCode(() => db.insert(bloqueo).values({ ...base, status: 'resuelto' }))).toBe(CHECK_VIOLATION)
    expect(await pgErrorCode(() => db.insert(bloqueo).values({ ...base, status: 'activo', resolvedBy: user.id }))).toBe(
      CHECK_VIOLATION,
    )
    expect(
      await pgErrorCode(() =>
        db.insert(bloqueo).values({ ...base, status: 'resuelto', resolvedBy: user.id, resolvedAt: new Date() }),
      ),
    ).toBeUndefined()
  })
})
