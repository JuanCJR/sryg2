import { randomInt, randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import {
  auditoria,
  bloqueo,
  catalogAircraft,
  catalogClassRating,
  catalogFunction,
  catalogLicenseObservation,
  catalogLicenseType,
  catalogTypeRating,
  certificadoMedico,
  createDb,
  habilitacionClase,
  habilitacionTipo,
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
const RUN = randomUUID().slice(0, 8)
const TODAY = new Date().toISOString().slice(0, 10)

/** `YYYY-MM-DD` shifted by whole days from today (UTC). */
function daysFromToday(days: number): string {
  const date = new Date(`${TODAY}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

type PersonKey = 'holder' | 'noCertificate' | 'expiredCertificate' | 'blocked' | 'other'

describe('licenses http (W1-5)', () => {
  let app: INestApplication
  let users: Record<'admin' | 'supLic' | 'supMed' | 'consulta', TestUser>
  const people = {} as Record<PersonKey, { id: string; cedula: string }>
  const catalog = {} as {
    typeClass1: string
    typePermanent: string
    typeInactive: string
    typeRating: string
    fn: string
    classRating: string
    aircraftA: string
    aircraftB: string
    obsA: string
    obsB: string
    obsInactive: string
  }
  const http = () => request(app.getHttpServer())
  const as = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` })
  const auditRows = (entityId: string) => db.select().from(auditoria).where(eq(auditoria.entityId, entityId))
  const licensesOf = (personalId: string) => db.select().from(licencia).where(eq(licencia.personalId, personalId))

  beforeAll(async () => {
    app = await createTestApp()
    users = await createTestUsers(db, app, {
      admin: { role: 'administrador', area: 'ambas' },
      supLic: { role: 'supervisor', area: 'licencias' },
      supMed: { role: 'supervisor', area: 'medicina' },
      consulta: { role: 'consulta', area: 'ambas' },
    })
    const keys: PersonKey[] = ['holder', 'noCertificate', 'expiredCertificate', 'blocked', 'other']
    for (const key of keys) {
      const cedula = String(randomInt(10_000_000, 99_999_999))
      const [row] = await db
        .insert(personalAeronautico)
        .values({
          cedula,
          firstNames: `Lic${RUN}`,
          lastNames: key === 'other' ? `Otra${RUN}` : `Prueba ${key}`,
          createdBy: users.admin.id,
          updatedBy: users.admin.id,
        })
        .returning()
      people[key] = { id: row!.id, cedula }
    }
    const [typeClass1, typePermanent, typeInactive] = await db
      .insert(catalogLicenseType)
      .values([
        {
          nameEs: `${RUN} Piloto Comercial - Avión`,
          nameEn: 'Commercial Pilot - Airplane',
          rav60Category: 'piloto_comercial',
          requiredMedicalClass: 'clase_1',
          validityMonths: 24,
          validityIsPlaceholder: false,
        },
        {
          nameEs: `${RUN} Técnico de Mantenimiento`,
          rav60Category: 'tecnico_mantenimiento',
          appliesExpiry: false,
          validityMonths: null,
        },
        { nameEs: `${RUN} Tipo Inactivo`, rav60Category: 'piloto_privado', active: false, validityMonths: 12 },
      ])
      .returning()
    const [typeRating] = await db
      .insert(catalogTypeRating)
      .values({ nameEs: `${RUN} B737`, nameEn: 'B737' })
      .returning()
    const [fn] = await db
      .insert(catalogFunction)
      .values({ nameEs: `${RUN} Capitán`, nameEn: 'PIC' })
      .returning()
    const [classRating] = await db
      .insert(catalogClassRating)
      .values({ nameEs: `${RUN} Monomotores Terrestres`, nameEn: 'Single Engine Land' })
      .returning()
    const [aircraftA, aircraftB] = await db
      .insert(catalogAircraft)
      .values([{ nameEs: `${RUN} C172` }, { nameEs: `${RUN} PA-28` }])
      .returning()
    const [obsA, obsB, obsInactive] = await db
      .insert(catalogLicenseObservation)
      .values([
        { nameEs: `${RUN} No válida para vuelos internacionales` },
        { nameEs: `${RUN} Debe usar lentes correctores` },
        { nameEs: `${RUN} Observación inactiva`, active: false },
      ])
      .returning()
    Object.assign(catalog, {
      typeClass1: typeClass1!.id,
      typePermanent: typePermanent!.id,
      typeInactive: typeInactive!.id,
      typeRating: typeRating!.id,
      fn: fn!.id,
      classRating: classRating!.id,
      aircraftA: aircraftA!.id,
      aircraftB: aircraftB!.id,
      obsA: obsA!.id,
      obsB: obsB!.id,
      obsInactive: obsInactive!.id,
    })
    const certificate = (personalId: string, expiryDate: string, rav67Class: 'clase_1' | 'clase_2' = 'clase_1') => ({
      personalId,
      rav67Class,
      number: 'C-1',
      issueDate: '2020-01-01',
      expiryDate,
    })
    await db
      .insert(certificadoMedico)
      .values([
        certificate(people.holder.id, daysFromToday(200)),
        certificate(people.blocked.id, daysFromToday(200)),
        certificate(people.other.id, daysFromToday(200)),
        certificate(people.expiredCertificate.id, daysFromToday(-1)),
        certificate(people.noCertificate.id, daysFromToday(200), 'clase_2'),
      ])
    await db.insert(bloqueo).values({
      personalId: people.blocked.id,
      type: 'medico',
      reason: 'Impedimento ficticio',
      createdBy: users.admin.id,
    })
  })

  afterAll(async () => {
    await app.close()
    const personIds = Object.values(people).map((p) => p.id)
    const licenseIds = (await db.select().from(licencia).where(inArray(licencia.personalId, personIds))).map(
      (l) => l.id,
    )
    if (licenseIds.length > 0) {
      await db.delete(habilitacionTipo).where(inArray(habilitacionTipo.licenciaId, licenseIds))
      await db.delete(habilitacionClase).where(inArray(habilitacionClase.licenciaId, licenseIds))
      await db.delete(licencia).where(inArray(licencia.id, licenseIds))
    }
    await db.delete(certificadoMedico).where(inArray(certificadoMedico.personalId, personIds))
    await db.delete(bloqueo).where(inArray(bloqueo.personalId, personIds))
    await db.delete(personalAeronautico).where(inArray(personalAeronautico.id, personIds))
    await db
      .delete(catalogLicenseType)
      .where(inArray(catalogLicenseType.id, [catalog.typeClass1, catalog.typePermanent, catalog.typeInactive]))
    await db.delete(catalogTypeRating).where(eq(catalogTypeRating.id, catalog.typeRating))
    await db.delete(catalogFunction).where(eq(catalogFunction.id, catalog.fn))
    await db.delete(catalogClassRating).where(eq(catalogClassRating.id, catalog.classRating))
    await db.delete(catalogAircraft).where(inArray(catalogAircraft.id, [catalog.aircraftA, catalog.aircraftB]))
    await db
      .delete(catalogLicenseObservation)
      .where(inArray(catalogLicenseObservation.id, [catalog.obsA, catalog.obsB, catalog.obsInactive]))
    await deleteTestUsers(db, users)
    await pool.end()
  })

  const issueBody = (personalId: string, extra: Record<string, unknown> = {}) => ({
    personalId,
    licenseTypeId: catalog.typeClass1,
    issueDate: '2026-01-31',
    ...extra,
  })

  describe('access (D1, D24)', () => {
    it('requires a token', async () => {
      await http().get('/api/licenses').expect(401)
      await http().post('/api/licenses').send(issueBody(people.other.id)).expect(401)
    })

    it('lets every role read but only the Admin and the Supervisor de Licencias write', async () => {
      await http().get('/api/licenses').set(as(users.consulta)).expect(200)
      await http().get('/api/licenses').set(as(users.supMed)).expect(200)
      await http().post('/api/licenses').set(as(users.consulta)).send(issueBody(people.other.id)).expect(403)
      await http().post('/api/licenses').set(as(users.supMed)).send(issueBody(people.other.id)).expect(403)
      expect(await licensesOf(people.other.id)).toHaveLength(0)
    })

    it('validates the body (400)', async () => {
      await http().post('/api/licenses').set(as(users.supLic)).send({ personalId: people.other.id }).expect(400)
      await http().get('/api/licenses/not-a-uuid').set(as(users.supLic)).expect(400)
    })
  })

  describe('issue', () => {
    it('computes the expiry from the type, defaults the number to the document (D22) and audits emitir', async () => {
      const res = await http()
        .post('/api/licenses')
        .set(as(users.supLic))
        .send(issueBody(people.holder.id, { observationIds: [catalog.obsA] }))
        .expect(201)
      expect(res.body).toMatchObject({
        personalId: people.holder.id,
        number: people.holder.cedula,
        issueDate: '2026-01-31',
        expiryDate: '2028-01-31',
        status: 'vigente',
        licenseType: { id: catalog.typeClass1, rav60Category: 'piloto_comercial', requiredMedicalClass: 'clase_1' },
        observations: [{ id: catalog.obsA }],
        typeRatings: [],
        classRatings: [],
      })
      const rows = await auditRows(res.body.id)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ action: 'emitir', entity: 'licencia', actorId: users.supLic.id })
    })

    it('does not expire when the type does not apply expiry (D20)', async () => {
      const res = await http()
        .post('/api/licenses')
        .set(as(users.admin))
        .send(issueBody(people.holder.id, { licenseTypeId: catalog.typePermanent, number: 'TM-0001' }))
        .expect(201)
      expect(res.body).toMatchObject({ number: 'TM-0001', expiryDate: null, status: 'vigente' })
    })

    it('issues the ratings of the same trámite in the same transaction', async () => {
      const res = await http()
        .post('/api/licenses')
        .set(as(users.supLic))
        .send(
          issueBody(people.other.id, {
            addTypeRatings: [{ typeRatingId: catalog.typeRating, functionId: catalog.fn, expiryDate: '2027-06-30' }],
            addClassRatings: [
              {
                classRatingId: catalog.classRating,
                aircraftIds: [catalog.aircraftA, catalog.aircraftB],
                expiryDate: daysFromToday(10),
              },
            ],
          }),
        )
        .expect(201)
      expect(res.body.typeRatings).toEqual([
        expect.objectContaining({
          typeRating: expect.objectContaining({ id: catalog.typeRating, nameEn: 'B737' }),
          function: expect.objectContaining({ id: catalog.fn }),
          expiryDate: '2027-06-30',
        }),
      ])
      expect(res.body.classRatings).toEqual([
        expect.objectContaining({ status: 'proxima_a_vencer', expiryDate: daysFromToday(10) }),
      ])
      expect(res.body.classRatings[0].aircraft.map((a: { id: string }) => a.id).sort()).toEqual(
        [catalog.aircraftA, catalog.aircraftB].sort(),
      )
      const ratingAudit = await auditRows(res.body.typeRatings[0].id)
      expect(ratingAudit).toMatchObject([{ action: 'emitir', entity: 'habilitacion_tipo' }])
    })

    it('answers 409 while the person has an active block (BR-07) and writes nothing', async () => {
      const res = await http()
        .post('/api/licenses')
        .set(as(users.supLic))
        .send(issueBody(people.blocked.id))
        .expect(409)
      expect(res.body.message).toMatch(/bloqueo activo/i)
      expect(await licensesOf(people.blocked.id)).toHaveLength(0)
    })

    it('answers 409 with the reason when no valid medical certificate of the required class exists (D13)', async () => {
      const missing = await http()
        .post('/api/licenses')
        .set(as(users.supLic))
        .send(issueBody(people.noCertificate.id))
        .expect(409)
      expect(missing.body.message).toMatch(/certificado médico vigente de clase 1/i)
      const expired = await http()
        .post('/api/licenses')
        .set(as(users.supLic))
        .send(issueBody(people.expiredCertificate.id))
        .expect(409)
      expect(expired.body.message).toMatch(/certificado médico vigente de clase 1/i)
      expect(await licensesOf(people.noCertificate.id)).toHaveLength(0)
      // A type that requires no medical class issues without a certificate.
      await http()
        .post('/api/licenses')
        .set(as(users.supLic))
        .send(issueBody(people.noCertificate.id, { licenseTypeId: catalog.typePermanent }))
        .expect(201)
    })

    it('rejects unknown or inactive catalog items (404) and rolls the whole trámite back', async () => {
      await http()
        .post('/api/licenses')
        .set(as(users.supLic))
        .send(issueBody(people.expiredCertificate.id, { licenseTypeId: catalog.typeInactive }))
        .expect(404)
      await http()
        .post('/api/licenses')
        .set(as(users.supLic))
        .send(issueBody(people.holder.id, { observationIds: [catalog.obsInactive] }))
        .expect(404)
      const before = (await licensesOf(people.holder.id)).length
      await http()
        .post('/api/licenses')
        .set(as(users.supLic))
        .send(
          issueBody(people.holder.id, {
            addTypeRatings: [{ typeRatingId: randomUUID(), functionId: catalog.fn, expiryDate: '2027-06-30' }],
          }),
        )
        .expect(404)
      expect(await licensesOf(people.holder.id)).toHaveLength(before)
      await http().post('/api/licenses').set(as(users.supLic)).send(issueBody(randomUUID())).expect(404)
    })
  })

  describe('renew', () => {
    let licenseId: string

    beforeAll(async () => {
      const res = await http()
        .post('/api/licenses')
        .set(as(users.supLic))
        .send(
          issueBody(people.holder.id, {
            number: 'R-100',
            observationIds: [catalog.obsA],
            addTypeRatings: [{ typeRatingId: catalog.typeRating, functionId: catalog.fn, expiryDate: '2026-12-31' }],
            addClassRatings: [
              { classRatingId: catalog.classRating, aircraftIds: [catalog.aircraftA], expiryDate: '2026-12-31' },
            ],
          }),
        )
        .expect(201)
      licenseId = res.body.id
    })

    it('recomputes the expiry, keeps the number, replaces observations and applies rating changes atomically', async () => {
      const current = await http().get(`/api/licenses/${licenseId}`).set(as(users.consulta)).expect(200)
      const [typeRating] = current.body.typeRatings
      const [classRating] = current.body.classRatings
      const res = await http()
        .post(`/api/licenses/${licenseId}/renew`)
        .set(as(users.supLic))
        .send({
          issueDate: '2026-10-01',
          observationIds: [catalog.obsB],
          renewTypeRatings: [{ id: typeRating.id, expiryDate: '2027-12-31' }],
          removeClassRatingIds: [classRating.id],
          addClassRatings: [
            { classRatingId: catalog.classRating, aircraftIds: [catalog.aircraftB], expiryDate: '2028-01-15' },
          ],
        })
        .expect(200)
      expect(res.body).toMatchObject({
        id: licenseId,
        number: 'R-100',
        issueDate: '2026-10-01',
        expiryDate: '2028-10-01',
        observations: [{ id: catalog.obsB }],
        typeRatings: [{ id: typeRating.id, expiryDate: '2027-12-31' }],
        classRatings: [{ expiryDate: '2028-01-15', aircraft: [{ id: catalog.aircraftB }] }],
      })
      expect(res.body.classRatings[0].id).not.toBe(classRating.id)

      const [renewed] = (await auditRows(licenseId)).filter((r) => r.action === 'renovar')
      expect(renewed).toMatchObject({ entity: 'licencia', actorId: users.supLic.id })
      expect(renewed!.changes).toMatchObject({
        before: { issueDate: '2026-01-31' },
        after: { issueDate: '2026-10-01' },
      })
      expect((await auditRows(typeRating.id)).map((r) => r.action)).toEqual(['emitir', 'renovar'])
      expect((await auditRows(classRating.id)).map((r) => r.action)).toEqual(['emitir', 'eliminar'])
    })

    it('answers 409 and changes nothing when a block appears before the renewal (BR-07)', async () => {
      const [block] = await db
        .insert(bloqueo)
        .values({ personalId: people.holder.id, type: 'administrativo', reason: 'Ficticio', createdBy: users.admin.id })
        .returning()
      try {
        await http()
          .post(`/api/licenses/${licenseId}/renew`)
          .set(as(users.supLic))
          .send({ issueDate: '2026-10-10' })
          .expect(409)
        const [row] = await db.select().from(licencia).where(eq(licencia.id, licenseId))
        expect(row!.issueDate).toBe('2026-10-01')
        const detail = await http().get(`/api/licenses/${licenseId}`).set(as(users.consulta)).expect(200)
        expect(detail.body.status).toBe('bloqueada')
      } finally {
        await db.delete(bloqueo).where(eq(bloqueo.id, block!.id))
      }
    })

    it('answers 404 for an unknown license and for a rating of another license', async () => {
      await http()
        .post(`/api/licenses/${randomUUID()}/renew`)
        .set(as(users.supLic))
        .send({ issueDate: '2026-10-10' })
        .expect(404)
      await http()
        .post(`/api/licenses/${licenseId}/renew`)
        .set(as(users.supLic))
        .send({ issueDate: '2026-10-10', removeTypeRatingIds: [randomUUID()] })
        .expect(404)
    })
  })

  describe('ratings', () => {
    let licenseId: string
    let expiredLicenseId: string

    beforeAll(async () => {
      const res = await http()
        .post('/api/licenses')
        .set(as(users.supLic))
        .send(issueBody(people.other.id, { licenseTypeId: catalog.typePermanent }))
        .expect(201)
      licenseId = res.body.id
      const [expired] = await db
        .insert(licencia)
        .values({
          personalId: people.other.id,
          licenseTypeId: catalog.typeClass1,
          number: 'VENCIDA',
          issueDate: '2020-01-01',
          expiryDate: '2022-01-01',
        })
        .returning()
      expiredLicenseId = expired!.id
    })

    it('adds, renews and removes a type rating, each audited', async () => {
      const added = await http()
        .post(`/api/licenses/${licenseId}/type-ratings`)
        .set(as(users.supLic))
        .send({ typeRatingId: catalog.typeRating, functionId: catalog.fn, expiryDate: '2027-03-01' })
        .expect(201)
      const ratingId = added.body.id
      expect(added.body).toMatchObject({ licenseId, expiryDate: '2027-03-01', status: 'vigente' })
      const renewed = await http()
        .post(`/api/licenses/${licenseId}/type-ratings/${ratingId}/renew`)
        .set(as(users.supLic))
        .send({ expiryDate: '2028-03-01' })
        .expect(200)
      expect(renewed.body.expiryDate).toBe('2028-03-01')
      await http().delete(`/api/licenses/${licenseId}/type-ratings/${ratingId}`).set(as(users.supLic)).expect(204)
      expect((await auditRows(ratingId)).map((r) => r.action)).toEqual(['emitir', 'renovar', 'eliminar'])
      await http().delete(`/api/licenses/${licenseId}/type-ratings/${ratingId}`).set(as(users.supLic)).expect(404)
    })

    it('adds, renews and removes a class rating with its aircraft', async () => {
      const added = await http()
        .post(`/api/licenses/${licenseId}/class-ratings`)
        .set(as(users.admin))
        .send({ classRatingId: catalog.classRating, aircraftIds: [catalog.aircraftA], expiryDate: '2027-03-01' })
        .expect(201)
      expect(added.body.aircraft).toMatchObject([{ id: catalog.aircraftA }])
      await http()
        .post(`/api/licenses/${licenseId}/class-ratings/${added.body.id}/renew`)
        .set(as(users.admin))
        .send({ expiryDate: '2028-03-01' })
        .expect(200)
      await http().delete(`/api/licenses/${licenseId}/class-ratings/${added.body.id}`).set(as(users.admin)).expect(204)
      expect((await auditRows(added.body.id)).map((r) => r.action)).toEqual(['emitir', 'renovar', 'eliminar'])
    })

    it('requires a valid license for a rating (D13) and forbids other roles', async () => {
      const res = await http()
        .post(`/api/licenses/${expiredLicenseId}/type-ratings`)
        .set(as(users.supLic))
        .send({ typeRatingId: catalog.typeRating, functionId: catalog.fn, expiryDate: '2027-03-01' })
        .expect(409)
      expect(res.body.message).toMatch(/licencia vigente/i)
      await http()
        .post(`/api/licenses/${licenseId}/type-ratings`)
        .set(as(users.supMed))
        .send({ typeRatingId: catalog.typeRating, functionId: catalog.fn, expiryDate: '2027-03-01' })
        .expect(403)
    })
  })

  describe('query, check and history', () => {
    it('filters by applicant, number, type, person and an expiry range (as in SLYM)', async () => {
      const byApplicant = await http()
        .get('/api/licenses')
        .query({ q: `Otra${RUN}` })
        .set(as(users.consulta))
        .expect(200)
      expect(byApplicant.body.total).toBeGreaterThan(0)
      expect(byApplicant.body.items.every((i: { personalId: string }) => i.personalId === people.other.id)).toBe(true)
      expect(byApplicant.body.items[0]).toMatchObject({
        person: { cedula: people.other.cedula, lastNames: `Otra${RUN}` },
        licenseType: { nameEs: expect.any(String) },
      })

      const byCedula = await http()
        .get('/api/licenses')
        .query({ q: people.other.cedula })
        .set(as(users.consulta))
        .expect(200)
      expect(byCedula.body.total).toBe(byApplicant.body.total)

      const byNumber = await http().get('/api/licenses').query({ number: 'R-100' }).set(as(users.consulta)).expect(200)
      expect(byNumber.body.items.map((i: { number: string }) => i.number)).toContain('R-100')

      const byType = await http()
        .get('/api/licenses')
        .query({ licenseTypeId: catalog.typePermanent, personalId: people.holder.id })
        .set(as(users.consulta))
        .expect(200)
      expect(byType.body.items).toHaveLength(1)
      expect(byType.body.items[0]).toMatchObject({ number: 'TM-0001', expiryDate: null })

      const byRange = await http()
        .get('/api/licenses')
        .query({ personalId: people.holder.id, expiryFrom: '2028-01-01', expiryTo: '2028-01-31' })
        .set(as(users.consulta))
        .expect(200)
      expect(byRange.body.items.map((i: { expiryDate: string }) => i.expiryDate)).toEqual(['2028-01-31'])
    })

    it('lists the licenses of a person with their ratings for the Expediente', async () => {
      const res = await http().get(`/api/personnel/${people.other.id}/licenses`).set(as(users.consulta)).expect(200)
      expect(res.body.length).toBeGreaterThanOrEqual(2)
      expect(res.body.find((l: { number: string }) => l.number === 'VENCIDA')).toMatchObject({ status: 'vencida' })
    })

    it('pre-checks a trámite: block, D13 coherence and the projected expiry', async () => {
      const blocked = await http()
        .get('/api/licenses/check')
        .query({ personalId: people.blocked.id })
        .set(as(users.supLic))
        .expect(200)
      expect(blocked.body).toMatchObject({ blocked: true, projection: null })
      expect(blocked.body.problems[0]).toMatch(/bloqueo activo/i)

      const incoherent = await http()
        .get('/api/licenses/check')
        .query({ personalId: people.noCertificate.id, licenseTypeId: catalog.typeClass1, issueDate: '2026-02-28' })
        .set(as(users.supLic))
        .expect(200)
      expect(incoherent.body).toMatchObject({
        blocked: false,
        projection: { expiryDate: '2028-02-28', appliesExpiry: true, validityIsPlaceholder: false },
      })
      expect(incoherent.body.problems).toEqual([expect.stringMatching(/clase 1/)])

      const clear = await http()
        .get('/api/licenses/check')
        .query({ personalId: people.holder.id, licenseTypeId: catalog.typePermanent, issueDate: '2026-02-28' })
        .set(as(users.supLic))
        .expect(200)
      expect(clear.body).toEqual({
        blocked: false,
        problems: [],
        projection: { expiryDate: null, appliesExpiry: false, validityIsPlaceholder: true },
      })
    })

    it('shows the history of a license and its ratings to the roles that read the audit trail', async () => {
      const { body } = await http()
        .get('/api/licenses')
        .query({ number: 'R-100', personalId: people.holder.id })
        .set(as(users.consulta))
        .expect(200)
      const id = body.items[0].id
      const history = await http().get(`/api/licenses/${id}/history`).set(as(users.supMed)).expect(200)
      const actions = history.body.map((e: { entity: string; action: string }) => `${e.entity}:${e.action}`)
      expect(actions).toEqual(
        expect.arrayContaining([
          'licencia:emitir',
          'licencia:renovar',
          'habilitacion_tipo:renovar',
          'habilitacion_clase:eliminar',
        ]),
      )
      expect(history.body[0].actorName).toBe('Test supLic')
      await http().get(`/api/licenses/${id}/history`).set(as(users.consulta)).expect(403)
      // Reads never write audit rows.
      const rows = await db
        .select()
        .from(auditoria)
        .where(and(eq(auditoria.entityId, id), eq(auditoria.actorId, users.consulta.id)))
      expect(rows).toHaveLength(0)
    })
  })
})
