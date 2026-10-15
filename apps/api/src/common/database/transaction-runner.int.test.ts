import { auditoria, createDb, usuario, type DbExecutor } from '@sryg/db'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { AuditLogRepository } from '../../audit/repositories/audit-log.repository'
import { TransactionRunner } from './transaction-runner'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const EMAIL = 'uow-subject@sryg.test'
const ENTITY = 'uow-test' // marker: auditoria is append-only, rows are filtered by this entity name

const { db, pool } = createDb(DATABASE_URL)

// Stand-in "entity mutation": inserting a usuario row through the transaction-bound executor.
interface Repos {
  audit: AuditLogRepository
  insertSubject: () => Promise<void>
}
const transaction = new TransactionRunner<Repos>(db, (tx: DbExecutor) => ({
  audit: new AuditLogRepository(tx),
  insertSubject: async () => {
    await tx
      .insert(usuario)
      .values({ email: EMAIL, fullName: 'Subject', role: 'consulta', area: 'ambas', passwordHash: 'x' })
  },
}))

const countSubject = async () => (await db.select().from(usuario).where(eq(usuario.email, EMAIL))).length
const countAudit = async () => (await db.select().from(auditoria).where(eq(auditoria.entity, ENTITY))).length
const cleanup = async () => {
  await db.delete(usuario).where(eq(usuario.email, EMAIL))
}

describe('TransactionRunner', () => {
  beforeEach(cleanup)
  afterAll(async () => {
    await cleanup()
    await pool.end()
  })

  it('commits the entity mutation and its audit row together', async () => {
    const before = await countAudit()
    await transaction.run(async ({ insertSubject, audit }) => {
      await insertSubject()
      await audit.record({
        actorId: null,
        action: 'crear',
        entity: ENTITY,
        entityId: null,
        changes: { after: { e: 1 } },
      })
    })
    expect(await countSubject()).toBe(1)
    expect(await countAudit()).toBe(before + 1)
  })

  it('rolls back the entity mutation when the audit write fails', async () => {
    const missingActor = '00000000-0000-4000-8000-000000000000' // FK violation on auditoria.actor_id
    await expect(
      transaction.run(async ({ insertSubject, audit }) => {
        await insertSubject()
        await audit.record({ actorId: missingActor, action: 'crear', entity: ENTITY, entityId: null })
      }),
    ).rejects.toThrow()
    expect(await countSubject()).toBe(0)
  })

  it('rolls back everything when the work callback throws after the audit write', async () => {
    const before = await countAudit()
    await expect(
      transaction.run(async ({ insertSubject, audit }) => {
        await insertSubject()
        await audit.record({ actorId: null, action: 'crear', entity: ENTITY, entityId: null })
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(await countSubject()).toBe(0)
    expect(await countAudit()).toBe(before)
  })
})
