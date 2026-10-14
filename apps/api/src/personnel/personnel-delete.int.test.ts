import { randomInt, randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import {
  auditoria,
  bloqueo,
  catalogLicenseType,
  certificadoMedico,
  createDb,
  licencia,
  personalAeronautico,
} from '@sryg/db'
import { and, eq, inArray } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../test/create-test-app'
import { createTestUsers, deleteTestUsers, type TestUser } from '../test/test-users'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)
const RUN = `zz${randomUUID().slice(0, 8)}`
// Five consecutive cedulas of this run, one per scenario.
const BASE = randomInt(10_000_000, 99_999_000)
const cedulas: string[] = []

describe('DELETE /api/personnel/:id (PER-07, BR-10)', () => {
  let app: INestApplication
  let users: Record<'supervisor' | 'consulta', TestUser>
  let licenseTypeId: string
  const http = () => request(app.getHttpServer())
  const bearer = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` })

  const createPerson = async () => {
    const cedula = String(BASE + cedulas.length)
    cedulas.push(cedula)
    const res = await http()
      .post('/api/personnel')
      .set(bearer(users.supervisor))
      .send({ cedula, firstNames: 'Persona', lastNames: `${RUN} Ficticia` })
      .expect(201)
    return res.body.id as string
  }
  const exists = async (id: string) =>
    (await db.select().from(personalAeronautico).where(eq(personalAeronautico.id, id))).length === 1
  const deletions = (id: string) =>
    db
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.entityId, id), eq(auditoria.action, 'eliminar')))

  beforeAll(async () => {
    app = await createTestApp()
    users = await createTestUsers(db, app, {
      supervisor: { role: 'supervisor', area: 'licencias' },
      consulta: { role: 'consulta', area: 'ambas' },
    })
    const [type] = await db
      .insert(catalogLicenseType)
      .values({ nameEs: `${RUN} Piloto Privado`, rav60Category: 'piloto_privado' })
      .returning({ id: catalogLicenseType.id })
    licenseTypeId = type!.id
  })
  afterAll(async () => {
    await app.close()
    const people = db
      .select({ id: personalAeronautico.id })
      .from(personalAeronautico)
      .where(inArray(personalAeronautico.cedula, cedulas))
    await db.delete(licencia).where(inArray(licencia.personalId, people))
    await db.delete(certificadoMedico).where(inArray(certificadoMedico.personalId, people))
    await db.delete(bloqueo).where(inArray(bloqueo.personalId, people))
    await db.delete(personalAeronautico).where(inArray(personalAeronautico.cedula, cedulas))
    await db.delete(catalogLicenseType).where(eq(catalogLicenseType.id, licenseTypeId))
    await deleteTestUsers(db, users)
    await pool.end()
  })

  it('deletes a person without credentials and writes one eliminar audit row with the record', async () => {
    const id = await createPerson()
    await http().delete(`/api/personnel/${id}`).set(bearer(users.supervisor)).expect(204)
    expect(await exists(id)).toBe(false)
    const rows = await deletions(id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ actorId: users.supervisor.id, entity: 'personal_aeronautico' })
    expect(rows[0]?.changes).toMatchObject({ before: { id, lastNames: `${RUN} Ficticia` } })
    await http().get(`/api/personnel/${id}`).set(bearer(users.supervisor)).expect(404)
  })

  it('answers 409 and keeps the person when a license exists', async () => {
    const id = await createPerson()
    await db.insert(licencia).values({ personalId: id, licenseTypeId, number: 'L-1', issueDate: '2026-01-01' })
    const res = await http().delete(`/api/personnel/${id}`).set(bearer(users.supervisor)).expect(409)
    expect(res.body).toMatchObject({ statusCode: 409, error: 'Conflict' })
    expect(await exists(id)).toBe(true)
    expect(await deletions(id)).toHaveLength(0)
  })

  it('answers 409 and keeps the person when a medical certificate exists', async () => {
    const id = await createPerson()
    await db.insert(certificadoMedico).values({
      personalId: id,
      rav67Class: 'clase_1',
      number: 'M-1',
      issueDate: '2026-01-01',
      expiryDate: '2027-01-01',
    })
    await http().delete(`/api/personnel/${id}`).set(bearer(users.supervisor)).expect(409)
    expect(await exists(id)).toBe(true)
  })

  it('answers 409 when a block references the person, instead of a database error', async () => {
    const id = await createPerson()
    await db
      .insert(bloqueo)
      .values({ personalId: id, type: 'administrativo', reason: 'x', createdBy: users.supervisor.id })
    await http().delete(`/api/personnel/${id}`).set(bearer(users.supervisor)).expect(409)
    expect(await exists(id)).toBe(true)
    expect(await deletions(id)).toHaveLength(0)
  })

  it('answers 404 for an unknown id, 400 for a malformed one, 403 to Consulta and 401 without a token', async () => {
    await http().delete(`/api/personnel/${randomUUID()}`).set(bearer(users.supervisor)).expect(404)
    await http().delete('/api/personnel/not-a-uuid').set(bearer(users.supervisor)).expect(400)
    const id = await createPerson()
    await http().delete(`/api/personnel/${id}`).set(bearer(users.consulta)).expect(403)
    await http().delete(`/api/personnel/${id}`).expect(401)
    expect(await exists(id)).toBe(true)
  })
})
