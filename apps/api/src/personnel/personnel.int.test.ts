import { randomInt, randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { auditoria, catalogDocumentType, catalogNationality, createDb, personalAeronautico, usuario } from '@sryg/db'
import { and, eq, inArray } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Argon2PasswordHasher } from '../auth/services/argon2-password-hasher'
import { createTestApp } from '../test/create-test-app'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const PASSWORD = 'correct horse battery staple'
// Unique per run: users with audit rows (append-only, FK RESTRICT) cannot be deleted afterwards.
const EMAIL = `personnel-${randomUUID().slice(0, 8)}@sryg.test`
const DIGITS = String(randomInt(10_000_000, 99_999_999))
const LAST = `Prueba${DIGITS}`
const NAME = { firstNames: 'Ana María', lastNames: LAST }

const { db, pool } = createDb(DATABASE_URL)
const catalogIds: { documentType?: string; nationality?: string; inactiveNationality?: string } = {}

describe('personnel http', () => {
  let app: INestApplication
  let token: string
  let actorId: string
  const http = () => request(app.getHttpServer())
  const auth = () => ({ Authorization: `Bearer ${token}` })
  const auditCount = async (entityId?: string) =>
    (
      await db
        .select()
        .from(auditoria)
        .where(
          and(
            eq(auditoria.actorId, actorId),
            eq(auditoria.entity, 'personal_aeronautico'),
            entityId ? eq(auditoria.entityId, entityId) : undefined,
          ),
        )
    ).length
  const personnelCount = async () =>
    (await db.select().from(personalAeronautico).where(eq(personalAeronautico.cedula, DIGITS))).length

  beforeAll(async () => {
    const passwordHash = await new Argon2PasswordHasher().hash(PASSWORD)
    await db
      .insert(usuario)
      .values({ email: EMAIL, fullName: 'Personnel Tester', role: 'supervisor', area: 'licencias', passwordHash })
    const [documentType] = await db
      .insert(catalogDocumentType)
      .values({ nameEs: `Cédula ${DIGITS}` })
      .returning({ id: catalogDocumentType.id })
    const [nationality, inactive] = await db
      .insert(catalogNationality)
      .values([{ nameEs: `Venezolana ${DIGITS}` }, { nameEs: `Antigua ${DIGITS}`, active: false }])
      .returning({ id: catalogNationality.id })
    Object.assign(catalogIds, {
      documentType: documentType!.id,
      nationality: nationality!.id,
      inactiveNationality: inactive!.id,
    })
    app = await createTestApp()
    const login = await http().post('/api/auth/login').send({ email: EMAIL, password: PASSWORD }).expect(200)
    token = login.body.accessToken
    actorId = login.body.user.id
  })
  afterAll(async () => {
    await app.close()
    await db.delete(personalAeronautico).where(eq(personalAeronautico.cedula, DIGITS))
    await db.delete(catalogDocumentType).where(eq(catalogDocumentType.id, catalogIds.documentType!))
    await db
      .delete(catalogNationality)
      .where(inArray(catalogNationality.id, [catalogIds.nationality!, catalogIds.inactiveNationality!]))
    await db
      .delete(usuario)
      .where(eq(usuario.email, EMAIL))
      .catch(() => undefined)
    await pool.end()
  })

  it('requires a token on every personnel endpoint', async () => {
    const id = randomUUID()
    await http().get('/api/personnel').expect(401)
    await http().get(`/api/personnel/${id}`).expect(401)
    await http()
      .post('/api/personnel')
      .send({ cedula: DIGITS, ...NAME })
      .expect(401)
    await http().patch(`/api/personnel/${id}`).send({ cargo: 'x' }).expect(401)
  })

  it('validates the body (400) and writes nothing', async () => {
    const before = await auditCount()
    await http()
      .post('/api/personnel')
      .set(auth())
      .send({ ...NAME })
      .expect(400)
    await http()
      .post('/api/personnel')
      .set(auth())
      .send({ cedula: '123', ...NAME })
      .expect(400)
    await http().patch('/api/personnel/not-a-uuid').set(auth()).send({ cargo: 'x' }).expect(400)
    expect(await auditCount()).toBe(before)
  })

  it('creates with a normalized cedula, one audit row, and rejects a duplicate with 409 and no extra audit row', async () => {
    const before = await auditCount()
    const created = await http()
      .post('/api/personnel')
      .set(auth())
      .send({
        cedula: `V-${DIGITS.slice(0, 2)}.${DIGITS.slice(2, 5)}.${DIGITS.slice(5)}`,
        ...NAME,
        birthDate: '1985-03-09',
        address: 'Av. Las Delicias, Maracay',
        cargo: 'Piloto',
      })
      .expect(201)
    expect(created.body).toMatchObject({
      cedula: DIGITS,
      ...NAME,
      birthDate: '1985-03-09',
      address: 'Av. Las Delicias, Maracay',
      status: 'activo',
      cargo: 'Piloto',
      hasPhoto: false,
      hasSignature: false,
    })
    expect(created.body).not.toHaveProperty('photo')
    expect(await auditCount()).toBe(before + 1)
    const [row] = await db
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.entityId, created.body.id), eq(auditoria.action, 'crear')))
    expect(row).toMatchObject({ actorId, entity: 'personal_aeronautico' })

    const duplicate = await http()
      .post('/api/personnel')
      .set(auth())
      .send({ cedula: DIGITS, firstNames: 'Someone', lastNames: 'Else' })
      .expect(409)
    expect(duplicate.body).toMatchObject({ statusCode: 409, error: 'Conflict' })
    expect(await personnelCount()).toBe(1)
    expect(await auditCount()).toBe(before + 1)
  })

  it('reads one and lists with search, without writing audit rows', async () => {
    const found = await http().get('/api/personnel').query({ q: LAST }).set(auth()).expect(200)
    expect(found.body).toMatchObject({ page: 1, pageSize: 20, total: 1 })
    const id = found.body.items[0].id
    const before = await auditCount()
    const one = await http().get(`/api/personnel/${id}`).set(auth()).expect(200)
    expect(one.body).toMatchObject({ id, cedula: DIGITS })
    expect(await auditCount()).toBe(before)
    await http().get(`/api/personnel/${randomUUID()}`).set(auth()).expect(404)
  })

  it('updates with PATCH, writes one actualizar row, 404 for unknown id, 409 for a taken cedula', async () => {
    const { body } = await http().get('/api/personnel').query({ q: LAST }).set(auth()).expect(200)
    const id: string = body.items[0].id
    const before = await auditCount(id)
    const updated = await http().patch(`/api/personnel/${id}`).set(auth()).send({ cargo: 'Capitan' }).expect(200)
    expect(updated.body).toMatchObject({ id, cargo: 'Capitan' })
    expect(await auditCount(id)).toBe(before + 1)
    const [row] = await db
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.entityId, id), eq(auditoria.action, 'actualizar')))
    expect(row?.changes).toEqual({ before: { cargo: 'Piloto' }, after: { cargo: 'Capitan' } })

    await http().patch(`/api/personnel/${randomUUID()}`).set(auth()).send({ cargo: 'x' }).expect(404)
    await http().patch(`/api/personnel/${id}`).set(auth()).send({}).expect(400)

    const otherDigits = String(Number(DIGITS) + 1)
    const other = await http()
      .post('/api/personnel')
      .set(auth())
      .send({ cedula: otherDigits, firstNames: 'Other', lastNames: 'Person' })
      .expect(201)
    const afterOther = await auditCount()
    await http().patch(`/api/personnel/${id}`).set(auth()).send({ cedula: otherDigits }).expect(409)
    expect(await auditCount()).toBe(afterOther)
    await db.delete(personalAeronautico).where(eq(personalAeronautico.id, other.body.id))
  })

  it('accepts active catalog items for document type and nationality and rejects unknown or inactive ones (D21)', async () => {
    const { body } = await http().get('/api/personnel').query({ q: LAST }).set(auth()).expect(200)
    const id: string = body.items[0].id
    const before = await auditCount(id)

    const unknown = await http()
      .patch(`/api/personnel/${id}`)
      .set(auth())
      .send({ documentTypeId: randomUUID() })
      .expect(400)
    expect(unknown.body.details).toEqual([{ path: 'documentTypeId', message: expect.any(String) }])
    const inactive = await http()
      .patch(`/api/personnel/${id}`)
      .set(auth())
      .send({ nationalityId: catalogIds.inactiveNationality })
      .expect(400)
    expect(inactive.body.details).toEqual([{ path: 'nationalityId', message: expect.any(String) }])
    await http()
      .post('/api/personnel')
      .set(auth())
      .send({ cedula: String(Number(DIGITS) + 2), ...NAME, nationalityId: randomUUID() })
      .expect(400)
    expect(await auditCount(id)).toBe(before)

    const updated = await http()
      .patch(`/api/personnel/${id}`)
      .set(auth())
      .send({ documentTypeId: catalogIds.documentType, nationalityId: catalogIds.nationality })
      .expect(200)
    expect(updated.body).toMatchObject({
      documentTypeId: catalogIds.documentType,
      nationalityId: catalogIds.nationality,
    })
    await http().patch(`/api/personnel/${id}`).set(auth()).send({ nationalityId: null }).expect(200)
  })
})
