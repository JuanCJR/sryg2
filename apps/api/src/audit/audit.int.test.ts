import { randomInt, randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import {
  auditoria,
  bloqueo,
  catalogClassRating,
  catalogLicenseType,
  certificadoMedico,
  createDb,
  habilitacionClase,
  licencia,
  personalAeronautico,
  usuario,
} from '@sryg/db'
import { count, eq, inArray } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Argon2PasswordHasher } from '../auth/infrastructure/argon2-password-hasher'
import { createTestApp } from '../test/create-test-app'
import { createTestUsers, deleteTestUsers, type TestUser } from '../test/test-users'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)
// Run-unique entity name: the trail is append-only, so the assertions ignore whatever else it holds.
const RUN = `zz${randomUUID().slice(0, 8)}`
const ENTITY = `${RUN}_entidad`

type Users = Record<'admin' | 'supMedicina' | 'consulta', TestUser>

describe('audit viewer http (REP-04, REP-05)', () => {
  let app: INestApplication
  let users: Users
  /** A user nobody logs in as, whose name would run as a spreadsheet formula. */
  let formulaActorId: string
  const ids = { person: randomUUID(), other: randomUUID(), loose: randomUUID() }
  const related: Record<'license' | 'rating' | 'certificate' | 'block', string> = {
    license: '',
    rating: '',
    certificate: '',
    block: '',
  }
  const cedulas = [String(randomInt(10_000_000, 99_999_999)), String(randomInt(10_000_000, 99_999_999))]
  const http = () => request(app.getHttpServer())
  const as = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` })
  const list = (query: Record<string, string | number>, user: TestUser = users.admin) =>
    http().get('/api/audit').query(query).set(as(user))
  const exportCsv = (query: Record<string, string>, user: TestUser = users.admin) =>
    http().get('/api/audit/export.csv').query(query).set(as(user))
  const trailSize = async () => (await db.select({ total: count() }).from(auditoria))[0]!.total

  beforeAll(async () => {
    app = await createTestApp()
    users = await createTestUsers(db, app, {
      admin: { role: 'administrador', area: 'ambas' },
      supMedicina: { role: 'supervisor', area: 'medicina' },
      consulta: { role: 'consulta', area: 'ambas' },
    })
    const passwordHash = await new Argon2PasswordHasher().hash(randomUUID())
    const [formulaActor] = await db
      .insert(usuario)
      .values({
        email: `formula-${RUN}@sryg.test`,
        fullName: `=SUM(1+1) ${RUN}`,
        role: 'consulta',
        area: 'ambas',
        passwordHash,
        isActive: false,
      })
      .returning({ id: usuario.id })
    formulaActorId = formulaActor!.id

    const by = { createdBy: users.admin.id, updatedBy: users.admin.id }
    await db.insert(personalAeronautico).values([
      { id: ids.person, cedula: cedulas[0]!, firstNames: 'Persona', lastNames: `Auditada ${RUN}`, ...by },
      { id: ids.other, cedula: cedulas[1]!, firstNames: 'Otra', lastNames: `Persona ${RUN}`, ...by },
    ])
    const [type] = await db
      .insert(catalogLicenseType)
      .values({ nameEs: `${RUN} Piloto Privado`, rav60Category: 'piloto_privado' })
      .returning()
    const [klass] = await db
      .insert(catalogClassRating)
      .values({ nameEs: `${RUN} Monomotores` })
      .returning()
    const [license] = await db
      .insert(licencia)
      .values({ personalId: ids.person, licenseTypeId: type!.id, number: cedulas[0]!, issueDate: '2026-01-10' })
      .returning()
    const [rating] = await db
      .insert(habilitacionClase)
      .values({ licenciaId: license!.id, classRatingId: klass!.id, expiryDate: '2027-01-10' })
      .returning()
    const [certificate] = await db
      .insert(certificadoMedico)
      .values({
        personalId: ids.person,
        rav67Class: 'clase_1',
        number: cedulas[0]!,
        issueDate: '2026-01-10',
        expiryDate: '2027-01-10',
      })
      .returning()
    const [block] = await db
      .insert(bloqueo)
      .values({ personalId: ids.person, type: 'administrativo', reason: 'Prueba', createdBy: users.admin.id })
      .returning()
    Object.assign(related, { license: license!.id, rating: rating!.id, certificate: certificate!.id, block: block!.id })

    const at = (iso: string) => new Date(iso)
    await db.insert(auditoria).values([
      {
        occurredAt: at('2026-10-01T08:00:00Z'),
        actorId: users.admin.id,
        action: 'crear',
        entity: ENTITY,
        entityId: ids.loose,
        changes: { after: { nota: 'texto con "comillas", comas\ny saltos' } },
      },
      {
        occurredAt: at('2026-10-02T23:59:59Z'),
        actorId: users.supMedicina.id,
        action: 'actualizar',
        entity: ENTITY,
        entityId: ids.loose,
      },
      { occurredAt: at('2026-10-03T00:00:00Z'), actorId: null, action: 'autenticar', entity: ENTITY, entityId: null },
      { occurredAt: at('2026-10-04T10:00:00Z'), actorId: formulaActorId, action: 'eliminar', entity: ENTITY },
      // The person's trail, written by the modules that own each entity.
      {
        occurredAt: at('2026-09-01T10:00:00Z'),
        actorId: users.admin.id,
        action: 'crear',
        entity: 'personal_aeronautico',
        entityId: ids.person,
      },
      {
        occurredAt: at('2026-09-02T10:00:00Z'),
        actorId: users.admin.id,
        action: 'emitir',
        entity: 'licencia',
        entityId: related.license,
      },
      {
        occurredAt: at('2026-09-03T10:00:00Z'),
        actorId: users.admin.id,
        action: 'crear',
        entity: 'habilitacion_clase',
        entityId: related.rating,
      },
      {
        occurredAt: at('2026-09-04T10:00:00Z'),
        actorId: users.supMedicina.id,
        action: 'emitir',
        entity: 'certificado_medico',
        entityId: related.certificate,
      },
      {
        occurredAt: at('2026-09-05T10:00:00Z'),
        actorId: users.supMedicina.id,
        action: 'bloquear',
        entity: 'bloqueo',
        entityId: related.block,
      },
      {
        occurredAt: at('2026-09-06T10:00:00Z'),
        actorId: users.admin.id,
        action: 'crear',
        entity: 'personal_aeronautico',
        entityId: ids.other,
      },
    ])
  })

  afterAll(async () => {
    await app.close()
    await db.delete(bloqueo).where(eq(bloqueo.personalId, ids.person))
    await db.delete(certificadoMedico).where(eq(certificadoMedico.personalId, ids.person))
    if (related.rating) await db.delete(habilitacionClase).where(eq(habilitacionClase.id, related.rating))
    await db.delete(licencia).where(eq(licencia.personalId, ids.person))
    await db.delete(catalogClassRating).where(eq(catalogClassRating.nameEs, `${RUN} Monomotores`))
    await db.delete(catalogLicenseType).where(eq(catalogLicenseType.nameEs, `${RUN} Piloto Privado`))
    await db.delete(personalAeronautico).where(inArray(personalAeronautico.id, [ids.person, ids.other]))
    await deleteTestUsers(db, users)
    await pool.end()
  })

  describe('access (D1: Admin and Supervisor read, Consulta has no access)', () => {
    it('requires a token', async () => {
      await http().get('/api/audit').expect(401)
      await http().get('/api/audit/export.csv').expect(401)
    })

    it('answers 403 to Consulta', async () => {
      await list({ entity: ENTITY }, users.consulta).expect(403)
      await exportCsv({ entity: ENTITY }, users.consulta).expect(403)
    })

    it('lets the Admin and a Supervisor of either area read and export', async () => {
      await list({ entity: ENTITY }, users.admin).expect(200)
      await list({ entity: ENTITY }, users.supMedicina).expect(200)
      await exportCsv({ entity: ENTITY }, users.supMedicina).expect(200)
    })
  })

  describe('GET /api/audit', () => {
    it('lists the matching entries newest first, with the actor', async () => {
      const res = await list({ entity: ENTITY }).expect(200)
      expect(res.body).toMatchObject({ page: 1, pageSize: 50, total: 4 })
      expect(res.body.items.map((e: { action: string }) => e.action)).toEqual([
        'eliminar',
        'autenticar',
        'actualizar',
        'crear',
      ])
      expect(res.body.items[3]).toEqual({
        id: expect.any(Number),
        occurredAt: '2026-10-01T08:00:00.000Z',
        actor: { id: users.admin.id, fullName: 'Test admin', email: users.admin.email },
        action: 'crear',
        entity: ENTITY,
        entityId: ids.loose,
        changes: { after: { nota: 'texto con "comillas", comas\ny saltos' } },
      })
      expect(res.body.items[1]).toMatchObject({ action: 'autenticar', actor: null, entityId: null })
    })

    it('paginates', async () => {
      const res = await list({ entity: ENTITY, page: 2, pageSize: 3 }).expect(200)
      expect(res.body).toMatchObject({ page: 2, pageSize: 3, total: 4 })
      expect(res.body.items.map((e: { action: string }) => e.action)).toEqual(['crear'])
    })

    it('filters by actor name or email, action and entity id', async () => {
      const byName = await list({ entity: ENTITY, actor: 'test SUPMEDICINA' }).expect(200)
      expect(byName.body.items.map((e: { action: string }) => e.action)).toEqual(['actualizar'])
      const byEmail = await list({ entity: ENTITY, actor: users.admin.email }).expect(200)
      expect(byEmail.body.items.map((e: { action: string }) => e.action)).toEqual(['crear'])
      const byAction = await list({ entity: ENTITY, action: 'autenticar' }).expect(200)
      expect(byAction.body.total).toBe(1)
      const byEntityId = await list({ entity: ENTITY, entityId: ids.loose }).expect(200)
      expect(byEntityId.body.items.map((e: { action: string }) => e.action)).toEqual(['actualizar', 'crear'])
    })

    it('treats the date range as whole UTC days, both ends included', async () => {
      const res = await list({ entity: ENTITY, from: '2026-10-02', to: '2026-10-03' }).expect(200)
      expect(res.body.items.map((e: { action: string }) => e.action)).toEqual(['autenticar', 'actualizar'])
      const single = await list({ entity: ENTITY, from: '2026-10-02', to: '2026-10-02' }).expect(200)
      expect(single.body.items.map((e: { action: string }) => e.action)).toEqual(['actualizar'])
    })

    it("filters a person's trail: their record plus licenses, ratings, certificates and blocks", async () => {
      const res = await list({ personId: ids.person }).expect(200)
      expect(res.body.items.map((e: { entity: string }) => e.entity)).toEqual([
        'bloqueo',
        'certificado_medico',
        'habilitacion_clase',
        'licencia',
        'personal_aeronautico',
      ])
      const other = await list({ personId: ids.other }).expect(200)
      expect(other.body.total).toBe(1)
      const narrowed = await list({ personId: ids.person, action: 'emitir' }).expect(200)
      expect(narrowed.body.total).toBe(2)
    })

    it('rejects an invalid query with 400', async () => {
      await list({ action: 'borrar_todo' }).expect(400)
      await list({ entityId: 'x' }).expect(400)
      await list({ from: '2026-10-05', to: '2026-10-01' }).expect(400)
      await list({ pageSize: 500 }).expect(400)
    })
  })

  describe('GET /api/audit/export.csv', () => {
    it('downloads every matching entry as CSV, with the same filters and no pagination', async () => {
      const res = await exportCsv({ entity: ENTITY, from: '2026-10-01' }).expect(200)
      expect(res.headers['content-type']).toMatch(/^text\/csv; charset=utf-8/)
      expect(res.headers['content-disposition']).toMatch(/^attachment; filename="auditoria-\d{8}-\d{6}\.csv"$/)
      const text: string = res.text
      expect(text.startsWith('\uFEFF')).toBe(true)
      const lines = text.slice(1).split('\r\n')
      expect(lines[0]).toBe('fecha,actor,correo,accion,entidad,id_entidad,cambios')
      expect(lines.at(-1)).toBe('')
      expect(text).toContain(
        `2026-10-02T23:59:59.000Z,Test supMedicina,${users.supMedicina.email},actualizar,${ENTITY},${ids.loose},`,
      )
      expect(text).toContain(`2026-10-03T00:00:00.000Z,,,autenticar,${ENTITY},,`)
      // RFC 4180 quoting for quotes, commas and line breaks.
      expect(text).toContain('"{""after"":{""nota"":""texto con \\""comillas\\"", comas\\ny saltos""}}"')
      // A value that a spreadsheet would run as a formula is neutralized.
      expect(text).toContain(`'=SUM(1+1) ${RUN}`)
      expect(text).not.toMatch(/,=SUM/)
      // Header + 4 entries + trailing line break.
      expect(lines).toHaveLength(6)
    })

    it('rejects an invalid query with 400', async () => {
      await exportCsv({ from: '2026-10-05', to: '2026-10-01' }).expect(400)
    })
  })

  it('is read-only: viewing and exporting write nothing to the trail', async () => {
    const before = await trailSize()
    await list({ entity: ENTITY }).expect(200)
    await exportCsv({ entity: ENTITY }).expect(200)
    expect(await trailSize()).toBe(before)
  })
})
