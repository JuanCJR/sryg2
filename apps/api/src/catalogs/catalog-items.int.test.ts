import { randomInt, randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { auditoria, catalogLicenseType, catalogNationality, createDb, personalAeronautico } from '@sryg/db'
import { and, eq, inArray, like } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../test/create-test-app'
import { createTestUsers, deleteTestUsers, type TestUser } from '../test/test-users'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)
// Run-unique marker so the assertions ignore whatever else the database holds.
const RUN = `zz${randomUUID().slice(0, 8)}`
const CEDULA = String(randomInt(10_000_000, 99_999_999))

describe('catalog maintenance http (D19, W1-11)', () => {
  let app: INestApplication
  let users: Record<'admin' | 'supervisor' | 'consulta', TestUser>
  const http = () => request(app.getHttpServer())
  const as = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` })
  const auditRows = (entityId: string) =>
    db
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.entityId, entityId), eq(auditoria.actorId, users.admin.id)))
  const create = (catalog: string, body: object) =>
    http().post(`/api/catalogs/${catalog}`).set(as(users.admin)).send(body)

  beforeAll(async () => {
    app = await createTestApp()
    users = await createTestUsers(db, app, {
      admin: { role: 'administrador', area: 'ambas' },
      supervisor: { role: 'supervisor', area: 'ambas' },
      consulta: { role: 'consulta', area: 'ambas' },
    })
  })
  afterAll(async () => {
    await app.close()
    await db.delete(personalAeronautico).where(eq(personalAeronautico.cedula, CEDULA))
    await db.delete(catalogNationality).where(like(catalogNationality.nameEs, `${RUN}%`))
    await db.delete(catalogLicenseType).where(like(catalogLicenseType.nameEs, `${RUN}%`))
    await deleteTestUsers(db, users)
    await pool.end()
  })

  it('lets only the Admin write, everybody read, and nobody without a token', async () => {
    const id = randomUUID()
    await http().get('/api/catalogs/nationalities').expect(401)
    await http()
      .post('/api/catalogs/nationalities')
      .send({ nameEs: `${RUN} X` })
      .expect(401)
    for (const user of [users.supervisor, users.consulta]) {
      await http().get('/api/catalogs/nationalities').set(as(user)).expect(200)
      await http()
        .post('/api/catalogs/nationalities')
        .set(as(user))
        .send({ nameEs: `${RUN} X` })
        .expect(403)
      await http().patch(`/api/catalogs/nationalities/${id}`).set(as(user)).send({ active: false }).expect(403)
      await http().delete(`/api/catalogs/nationalities/${id}`).set(as(user)).expect(403)
    }
    expect(
      await db
        .select()
        .from(catalogNationality)
        .where(eq(catalogNationality.nameEs, `${RUN} X`)),
    ).toEqual([])
  })

  it('answers 404 for an unknown catalog and 400 for an invalid body or id', async () => {
    await http().get('/api/catalogs/usuarios').set(as(users.admin)).expect(404)
    await create('usuarios', { nameEs: `${RUN} X` }).expect(404)
    await create('nationalities', { nameEs: '  ' }).expect(400)
    await create('license-types', { nameEs: `${RUN} Sin categoría` }).expect(400)
    await http()
      .patch('/api/catalogs/nationalities/not-a-uuid')
      .set(as(users.admin))
      .send({ active: false })
      .expect(400)
    await http().patch(`/api/catalogs/nationalities/${randomUUID()}`).set(as(users.admin)).send({}).expect(400)
  })

  it('creates an item with one crear audit row and rejects a case-insensitive duplicate with 409', async () => {
    const created = await create('nationalities', { nameEs: `${RUN} Venezolana`, nameEn: ' Venezuelan ' }).expect(201)
    expect(created.body).toEqual({
      id: expect.any(String),
      nameEs: `${RUN} Venezolana`,
      nameEn: 'Venezuelan',
      active: true,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })
    const rows = await auditRows(created.body.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ action: 'crear', entity: 'catalog_nationality' })

    const duplicate = await create('nationalities', { nameEs: `${RUN} VENEZOLANA` }).expect(409)
    expect(duplicate.body).toMatchObject({ statusCode: 409, error: 'Conflict' })
    expect(
      await db
        .select()
        .from(catalogNationality)
        .where(like(catalogNationality.nameEs, `${RUN}%`)),
    ).toHaveLength(1)
  })

  it('lists every item, active or not, with search on both names, pagination and an active filter', async () => {
    await create('nationalities', { nameEs: `${RUN} Colombiana`, nameEn: 'Colombian' }).expect(201)
    const inactive = await create('nationalities', { nameEs: `${RUN} Antigua` }).expect(201)
    await http()
      .patch(`/api/catalogs/nationalities/${inactive.body.id}`)
      .set(as(users.admin))
      .send({ active: false })
      .expect(200)

    const list = (query: Record<string, string>) =>
      http().get('/api/catalogs/nationalities').query(query).set(as(users.consulta)).expect(200)
    const all = await list({ q: RUN })
    expect(all.body).toMatchObject({ page: 1, pageSize: 20, total: 3 })
    expect(all.body.items.map((item: { nameEs: string }) => item.nameEs)).toEqual([
      `${RUN} Antigua`,
      `${RUN} Colombiana`,
      `${RUN} Venezolana`,
    ])
    expect((await list({ q: 'colombian' })).body.items.map((i: { nameEs: string }) => i.nameEs)).toContain(
      `${RUN} Colombiana`,
    )
    const second = await list({ q: RUN, page: '2', pageSize: '2' })
    expect(second.body).toMatchObject({ page: 2, pageSize: 2, total: 3 })
    expect(second.body.items).toHaveLength(1)
    expect((await list({ q: RUN, active: 'false' })).body).toMatchObject({ total: 1 })
    expect((await list({ q: RUN, active: 'true' })).body).toMatchObject({ total: 2 })
  })

  it('edits, deactivates and reactivates with one actualizar row each; deactivated items leave the options', async () => {
    const [item] = await db
      .select()
      .from(catalogNationality)
      .where(eq(catalogNationality.nameEs, `${RUN} Colombiana`))
    const patch = (body: object) =>
      http().patch(`/api/catalogs/nationalities/${item!.id}`).set(as(users.admin)).send(body)
    const options = async () =>
      (
        await http().get('/api/catalogs/nationalities/options').query({ q: RUN }).set(as(users.consulta)).expect(200)
      ).body.map((option: { id: string }) => option.id)
    const before = (await auditRows(item!.id)).length

    expect((await patch({ nameEn: 'Colombian (CO)' }).expect(200)).body).toMatchObject({ nameEn: 'Colombian (CO)' })
    expect((await patch({ active: false }).expect(200)).body).toMatchObject({ active: false })
    expect(await options()).not.toContain(item!.id)
    expect((await patch({ active: true }).expect(200)).body).toMatchObject({ active: true })
    expect(await options()).toContain(item!.id)

    const rows = (await auditRows(item!.id)).filter((row) => row.action === 'actualizar')
    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.changes)).toContainEqual({ before: { active: true }, after: { active: false } })
    expect(rows.map((row) => row.changes)).toContainEqual({
      before: { nameEn: 'Colombian' },
      after: { nameEn: 'Colombian (CO)' },
    })

    // A change that does not change anything writes nothing.
    await patch({ active: true }).expect(200)
    expect(await auditRows(item!.id)).toHaveLength(before + 3)
    await http()
      .patch(`/api/catalogs/nationalities/${randomUUID()}`)
      .set(as(users.admin))
      .send({ active: false })
      .expect(404)
  })

  it('answers 409 when the Spanish name of an edit is already taken', async () => {
    const [item] = await db
      .select()
      .from(catalogNationality)
      .where(eq(catalogNationality.nameEs, `${RUN} Colombiana`))
    const before = (await auditRows(item!.id)).length
    await http()
      .patch(`/api/catalogs/nationalities/${item!.id}`)
      .set(as(users.admin))
      .send({ nameEs: `${RUN} venezolana` })
      .expect(409)
    expect(await auditRows(item!.id)).toHaveLength(before)
  })

  it('edits the license-type fields; saving the validity clears validity_is_placeholder (D3)', async () => {
    const created = await create('license-types', {
      nameEs: `${RUN} Piloto Comercial - Avión`,
      nameEn: 'Commercial Pilot - Airplane',
      rav60Category: 'piloto_comercial',
      requiredMedicalClass: 'clase_1',
      appliesExpiry: true,
      validityMonths: 12,
    }).expect(201)
    expect(created.body).toMatchObject({
      rav60Category: 'piloto_comercial',
      requiredMedicalClass: 'clase_1',
      appliesExpiry: true,
      validityMonths: 12,
      validityIsPlaceholder: false,
    })

    // As the seed leaves it: a placeholder validity (D3).
    const [seeded] = await db
      .insert(catalogLicenseType)
      .values({ nameEs: `${RUN} Controlador`, rav60Category: 'controlador_transito_aereo', validityMonths: 12 })
      .returning()
    const patch = (body: object) =>
      http().patch(`/api/catalogs/license-types/${seeded!.id}`).set(as(users.admin)).send(body)

    expect((await patch({ nameEn: 'Air Traffic Controller' }).expect(200)).body).toMatchObject({
      validityIsPlaceholder: true,
    })
    // Confirming the placeholder value is saving a value too.
    const saved = await patch({ validityMonths: 12 }).expect(200)
    expect(saved.body).toMatchObject({ validityMonths: 12, validityIsPlaceholder: false })
    const updated = await patch({ requiredMedicalClass: 'clase_3', appliesExpiry: false, validityMonths: null }).expect(
      200,
    )
    expect(updated.body).toMatchObject({ requiredMedicalClass: 'clase_3', appliesExpiry: false, validityMonths: null })

    const rows = (await auditRows(seeded!.id)).map((row) => row.changes)
    expect(rows).toContainEqual({
      before: { validityIsPlaceholder: true },
      after: { validityIsPlaceholder: false },
    })
    expect((await auditRows(seeded!.id)).every((row) => row.entity === 'catalog_license_type')).toBe(true)

    await patch({ requiredMedicalClass: 'clase_9' }).expect(400)
    await patch({ validityMonths: 0 }).expect(400)
  })

  it('deletes an item nobody uses (eliminar audit row) and refuses with 409 an item in use', async () => {
    const unused = await create('nationalities', { nameEs: `${RUN} Sin uso` }).expect(201)
    await http().delete(`/api/catalogs/nationalities/${unused.body.id}`).set(as(users.admin)).expect(204)
    expect(await db.select().from(catalogNationality).where(eq(catalogNationality.id, unused.body.id))).toEqual([])
    expect((await auditRows(unused.body.id)).map((row) => row.action).sort()).toEqual(['crear', 'eliminar'])

    const inUse = await create('nationalities', { nameEs: `${RUN} En uso` }).expect(201)
    await db.insert(personalAeronautico).values({
      cedula: CEDULA,
      firstNames: 'Persona',
      lastNames: 'Ficticia',
      nationalityId: inUse.body.id,
      createdBy: users.admin.id,
      updatedBy: users.admin.id,
    })
    const refused = await http().delete(`/api/catalogs/nationalities/${inUse.body.id}`).set(as(users.admin)).expect(409)
    expect(refused.body.message).toMatch(/deactivate/i)
    expect(await db.select().from(catalogNationality).where(eq(catalogNationality.id, inUse.body.id))).toHaveLength(1)
    expect((await auditRows(inUse.body.id)).map((row) => row.action)).toEqual(['crear'])

    await http().delete(`/api/catalogs/nationalities/${randomUUID()}`).set(as(users.admin)).expect(404)
  })

  it('serves every D19 catalog', async () => {
    const created = await create('functions', { nameEs: `${RUN} Capitán`, nameEn: 'PIC' }).expect(201)
    const ids = [created.body.id]
    for (const catalog of ['type-ratings', 'class-ratings', 'aircraft', 'license-observations']) {
      await http().get(`/api/catalogs/${catalog}`).set(as(users.admin)).expect(200)
    }
    await http().delete(`/api/catalogs/functions/${ids[0]}`).set(as(users.admin)).expect(204)
    expect(await db.select().from(auditoria).where(inArray(auditoria.entityId, ids))).toHaveLength(2)
  })
})
