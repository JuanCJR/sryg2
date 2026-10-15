import { randomInt, randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { auditoria, bloqueo, createDb, personalAeronautico } from '@sryg/db'
import { and, eq, inArray } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DrizzleActiveBlockQuery } from '../shared/credentials/infrastructure/drizzle-active-block-query'
import { createTestApp } from '../test/create-test-app'
import { createTestUsers, deleteTestUsers, type TestUser } from '../test/test-users'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)
// Unique per run, so the name filter only ever matches this suite's fictitious people.
const LAST = `Bloqueo${randomInt(10_000_000, 99_999_999)}`

describe('validation-blocking http (VAL-03..05, D2, D24)', () => {
  let app: INestApplication
  let users: Record<'admin' | 'supLicencias' | 'supMedicina' | 'consulta', TestUser>
  const personIds: string[] = []
  const http = () => request(app.getHttpServer())
  const as = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` })
  const auditRows = (entityId: string) =>
    db
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.entity, 'bloqueo'), eq(auditoria.entityId, entityId)))
  const blockAuditCount = async () =>
    (
      await db
        .select()
        .from(auditoria)
        .where(
          and(
            eq(auditoria.entity, 'bloqueo'),
            inArray(
              auditoria.actorId,
              Object.values(users).map((u) => u.id),
            ),
          ),
        )
    ).length
  const newPerson = async (firstNames: string) => {
    const cedula = String(randomInt(10_000_000, 99_999_999))
    const res = await http()
      .post('/api/personnel')
      .set(as(users.admin))
      .send({ cedula, firstNames, lastNames: LAST })
      .expect(201)
    personIds.push(res.body.id)
    return res.body.id as string
  }
  const register = (user: TestUser, body: Record<string, unknown>) =>
    http().post('/api/blocks').set(as(user)).send(body)

  beforeAll(async () => {
    app = await createTestApp()
    users = await createTestUsers(db, app, {
      admin: { role: 'administrador', area: 'licencias' },
      supLicencias: { role: 'supervisor', area: 'licencias' },
      supMedicina: { role: 'supervisor', area: 'medicina' },
      consulta: { role: 'consulta', area: 'ambas' },
    })
  })
  afterAll(async () => {
    await app.close()
    if (personIds.length) {
      await db.delete(bloqueo).where(inArray(bloqueo.personalId, personIds))
      await db.delete(personalAeronautico).where(inArray(personalAeronautico.id, personIds))
    }
    await deleteTestUsers(db, users)
    await pool.end()
  })

  it('requires a token on every blocking endpoint', async () => {
    const id = randomUUID()
    await http().get('/api/blocks').expect(401)
    await http().get(`/api/blocks/${id}`).expect(401)
    await http().post('/api/blocks').send({ personalId: id, type: 'medico', reason: 'r' }).expect(401)
    await http().post(`/api/blocks/${id}/resolve`).send({ resolutionNote: 'n' }).expect(401)
  })

  it('registers an active block (Supervisor of any area) with one bloquear audit row', async () => {
    const personalId = await newPerson('Registro')
    const before = await blockAuditCount()
    const res = await register(users.supMedicina, {
      personalId,
      type: 'administrativo',
      reason: 'Impedimento administrativo ficticio',
      status: 'resuelto',
    }).expect(201)
    expect(res.body).toMatchObject({
      personalId,
      person: { firstNames: 'Registro', lastNames: LAST },
      type: 'administrativo',
      reason: 'Impedimento administrativo ficticio',
      status: 'activo',
      createdBy: { id: users.supMedicina.id, fullName: 'Test supMedicina' },
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: null,
    })
    expect(await blockAuditCount()).toBe(before + 1)
    expect(await auditRows(res.body.id)).toEqual([
      expect.objectContaining({
        actorId: users.supMedicina.id,
        action: 'bloquear',
        changes: {
          after: {
            personalId,
            type: 'administrativo',
            reason: 'Impedimento administrativo ficticio',
            status: 'activo',
          },
        },
      }),
    ])

    await register(users.supLicencias, { personalId, type: 'medico', reason: 'Otro impedimento' }).expect(201)
    await register(users.admin, { personalId, type: 'regulatorio', reason: 'Uno más' }).expect(201)
  })

  it('validates the body, the id and the query (400) and writes nothing', async () => {
    const personalId = await newPerson('Validacion')
    const before = await blockAuditCount()
    await register(users.admin, { personalId, type: 'medico', reason: '   ' }).expect(400)
    await register(users.admin, { personalId, type: 'otro', reason: 'r' }).expect(400)
    await register(users.admin, { personalId: 'x', type: 'medico', reason: 'r' }).expect(400)
    await http().post('/api/blocks/not-a-uuid/resolve').set(as(users.admin)).send({ resolutionNote: 'n' }).expect(400)
    await http().get('/api/blocks').query({ status: 'bloqueada' }).set(as(users.admin)).expect(400)
    expect(await blockAuditCount()).toBe(before)
  })

  it('answers 404 for an unknown person, block or resolution target, without audit rows', async () => {
    const before = await blockAuditCount()
    await register(users.admin, { personalId: randomUUID(), type: 'medico', reason: 'r' }).expect(404)
    await http().get(`/api/blocks/${randomUUID()}`).set(as(users.admin)).expect(404)
    await http()
      .post(`/api/blocks/${randomUUID()}/resolve`)
      .set(as(users.admin))
      .send({ resolutionNote: 'n' })
      .expect(404)
    expect(await blockAuditCount()).toBe(before)
  })

  it('lets Consulta read but answers 403 on register and resolve (D1)', async () => {
    const personalId = await newPerson('Consulta')
    const { body: block } = await register(users.admin, { personalId, type: 'medico', reason: 'r' }).expect(201)
    await register(users.consulta, { personalId, type: 'medico', reason: 'r' }).expect(403)
    await http()
      .post(`/api/blocks/${block.id}/resolve`)
      .set(as(users.consulta))
      .send({ resolutionNote: 'n' })
      .expect(403)
    await http().get('/api/blocks').set(as(users.consulta)).expect(200)
    const one = await http().get(`/api/blocks/${block.id}`).set(as(users.consulta)).expect(200)
    expect(one.body).toMatchObject({ id: block.id, status: 'activo' })
  })

  it('resolves with a mandatory note (BR-08), audits it as resolver, and refuses a second resolution (409)', async () => {
    const personalId = await newPerson('Resolucion')
    const { body: block } = await register(users.supLicencias, {
      personalId,
      type: 'medico',
      reason: 'Impedimento médico ficticio',
    }).expect(201)
    const activeBlocks = new DrizzleActiveBlockQuery(db)
    expect(await activeBlocks.hasActiveBlock(personalId)).toBe(true)

    await http().post(`/api/blocks/${block.id}/resolve`).set(as(users.supMedicina)).send({}).expect(400)
    const resolved = await http()
      .post(`/api/blocks/${block.id}/resolve`)
      .set(as(users.supMedicina))
      .send({ resolutionNote: '  Solventado ante la autoridad  ' })
      .expect(200)
    expect(resolved.body).toMatchObject({
      id: block.id,
      status: 'resuelto',
      resolutionNote: 'Solventado ante la autoridad',
      resolvedBy: { id: users.supMedicina.id, fullName: 'Test supMedicina' },
    })
    expect(Date.parse(resolved.body.resolvedAt)).not.toBeNaN()
    expect(await activeBlocks.hasActiveBlock(personalId)).toBe(false)
    const rows = await auditRows(block.id)
    expect(rows.map((r) => r.action).sort()).toEqual(['bloquear', 'resolver'])
    expect(rows.find((r) => r.action === 'resolver')).toMatchObject({
      actorId: users.supMedicina.id,
      changes: {
        before: { status: 'activo' },
        after: { status: 'resuelto', resolutionNote: 'Solventado ante la autoridad' },
      },
    })

    const again = await http()
      .post(`/api/blocks/${block.id}/resolve`)
      .set(as(users.admin))
      .send({ resolutionNote: 'Otra vez' })
      .expect(409)
    expect(again.body).toMatchObject({ statusCode: 409, error: 'Conflict' })
    expect(await auditRows(block.id)).toHaveLength(2)
  })

  it('lists with the status, type and person filters, newest first', async () => {
    const ana = await newPerson('Ana Filtro')
    const luis = await newPerson('Luis Filtro')
    const { body: first } = await register(users.admin, { personalId: ana, type: 'medico', reason: 'a1' }).expect(201)
    await register(users.admin, { personalId: ana, type: 'administrativo', reason: 'a2' }).expect(201)
    await register(users.admin, { personalId: luis, type: 'medico', reason: 'l1' }).expect(201)
    await http().post(`/api/blocks/${first.id}/resolve`).set(as(users.admin)).send({ resolutionNote: 'n' }).expect(200)

    const list = (query: Record<string, string>) =>
      http()
        .get('/api/blocks')
        .query({ q: 'Filtro', ...query })
        .set(as(users.consulta))
        .expect(200)
    const all = await list({})
    expect(all.body).toMatchObject({ page: 1, pageSize: 20, total: 3 })
    expect(all.body.items.map((b: { reason: string }) => b.reason)).toEqual(['l1', 'a2', 'a1'])
    expect((await list({ status: 'activo' })).body.total).toBe(2)
    expect((await list({ status: 'resuelto' })).body.items.map((b: { id: string }) => b.id)).toEqual([first.id])
    expect((await list({ type: 'medico' })).body.total).toBe(2)
    expect((await list({ personalId: ana })).body.total).toBe(2)
    expect((await list({ personalId: luis, status: 'activo', type: 'medico' })).body.total).toBe(1)
    expect((await list({ q: `Luis Filtro ${LAST}` })).body.total).toBe(1)
    expect((await list({ pageSize: '1', page: '2' })).body).toMatchObject({ total: 3, items: [{ reason: 'a2' }] })
  })

  it('accepts several statuses and types, comma-separated or as repeated params', async () => {
    const eva = await newPerson('Eva Multifiltro')
    const { body: resolved } = await register(users.admin, { personalId: eva, type: 'medico', reason: 'm1' }).expect(
      201,
    )
    await register(users.admin, { personalId: eva, type: 'administrativo', reason: 'a1' }).expect(201)
    await register(users.admin, { personalId: eva, type: 'regulatorio', reason: 'r1' }).expect(201)
    await http()
      .post(`/api/blocks/${resolved.id}/resolve`)
      .set(as(users.admin))
      .send({ resolutionNote: 'n' })
      .expect(200)

    const reasons = async (query: string) => {
      const { body } = await http().get(`/api/blocks?personalId=${eva}&${query}`).set(as(users.consulta)).expect(200)
      return body.items.map((b: { reason: string }) => b.reason).sort()
    }
    expect(await reasons('type=medico,administrativo')).toEqual(['a1', 'm1'])
    expect(await reasons('type=medico&type=regulatorio')).toEqual(['m1', 'r1'])
    expect(await reasons('status=activo,resuelto')).toEqual(['a1', 'm1', 'r1'])
    expect(await reasons('status=activo&type=medico,administrativo')).toEqual(['a1'])
    expect(await reasons('type=')).toEqual(['a1', 'm1', 'r1'])
    await http().get('/api/blocks?type=medico,otro').set(as(users.admin)).expect(400)
  })
})
