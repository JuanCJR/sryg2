import { randomInt, randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import {
  alerta,
  auditoria,
  catalogClassRating,
  catalogFunction,
  catalogLicenseType,
  catalogTypeRating,
  certificadoMedico,
  createDb,
  habilitacionClase,
  habilitacionTipo,
  licencia,
  parametroSistema,
  personalAeronautico,
} from '@sryg/db'
import { ALERT_THRESHOLD_KEY, type Alert } from '@sryg/types'
import { and, eq, inArray } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestApp } from '../test/create-test-app'
import { createTestUsers, deleteTestUsers, type TestUser } from '../test/test-users'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)
const RUN = randomUUID().slice(0, 8)
const DAY_MS = 86_400_000

/** `YYYY-MM-DD` of today (UTC) plus `days`, the same calendar the alerts module uses. */
const day = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10)

describe('alerts http', () => {
  let app: INestApplication
  let users: Record<'admin' | 'consulta', TestUser>
  let threshold: number
  const http = () => request(app.getHttpServer())
  const as = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` })

  // Fictitious fixtures, created and removed by this suite.
  const people = { ana: '', beto: '' }
  const catalogs = { licenseType: '', permanentType: '', typeRating: '', fn: '', classRating: '' }
  const ids = { license: '', permanentLicense: '', typeRating: '', classRating: '', anaCert: '', betoCert: '' }

  const listFor = async (personalId: string, query: Record<string, string> = {}, user = users.admin) => {
    const res = await http()
      .get('/api/alerts')
      .query({ personalId, pageSize: '100', ...query })
      .set(as(user))
      .expect(200)
    return res.body as { items: Alert[]; total: number; page: number; pageSize: number }
  }
  const keyOf = (a: Pick<Alert, 'credentialKind' | 'credentialId' | 'kind'>) =>
    `${a.credentialKind}:${a.credentialId}:${a.kind}`
  const keysFor = async (personalId: string, query: Record<string, string> = {}) =>
    (await listFor(personalId, query)).items.map(keyOf).sort()
  const ackAudits = (alertId: string) =>
    db
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.entity, 'alerta'), eq(auditoria.entityId, alertId), eq(auditoria.action, 'reconocer')))

  /** Resets the credentials to the baseline of the scenario before each test. */
  const setBaseline = async () => {
    await db
      .update(licencia)
      .set({ expiryDate: day(-5) })
      .where(eq(licencia.id, ids.license))
    await db
      .update(habilitacionTipo)
      .set({ expiryDate: day(10) })
      .where(eq(habilitacionTipo.id, ids.typeRating))
    await db
      .update(habilitacionClase)
      .set({ expiryDate: day(threshold + 60) })
      .where(eq(habilitacionClase.id, ids.classRating))
    await db
      .update(certificadoMedico)
      .set({ expiryDate: day(0) })
      .where(eq(certificadoMedico.id, ids.anaCert))
    await db
      .update(certificadoMedico)
      .set({ expiryDate: day(-1) })
      .where(eq(certificadoMedico.id, ids.betoCert))
    await db.delete(alerta).where(inArray(alerta.personalId, Object.values(people)))
  }

  beforeAll(async () => {
    app = await createTestApp()
    users = await createTestUsers(db, app, {
      admin: { role: 'administrador', area: 'ambas' },
      consulta: { role: 'consulta', area: 'licencias' },
    })
    const [param] = await db.select().from(parametroSistema).where(eq(parametroSistema.key, ALERT_THRESHOLD_KEY))
    threshold = param!.value as number

    for (const key of Object.keys(people) as Array<keyof typeof people>) {
      const [row] = await db
        .insert(personalAeronautico)
        .values({
          cedula: String(randomInt(10_000_000, 99_999_999)),
          firstNames: key === 'ana' ? 'Ana' : 'Beto',
          lastNames: `Alerta ${RUN}`,
          createdBy: users.admin.id,
          updatedBy: users.admin.id,
        })
        .returning()
      people[key] = row!.id
    }
    const [expiring, permanent] = await db
      .insert(catalogLicenseType)
      .values([
        { nameEs: `${RUN} Piloto Comercial`, rav60Category: 'piloto_comercial' },
        { nameEs: `${RUN} Técnico`, rav60Category: 'tecnico_mantenimiento', appliesExpiry: false },
      ])
      .returning()
    catalogs.licenseType = expiring!.id
    catalogs.permanentType = permanent!.id
    catalogs.typeRating = (
      await db
        .insert(catalogTypeRating)
        .values({ nameEs: `${RUN} B737` })
        .returning()
    )[0]!.id
    catalogs.fn = (
      await db
        .insert(catalogFunction)
        .values({ nameEs: `${RUN} Capitán` })
        .returning()
    )[0]!.id
    catalogs.classRating = (
      await db
        .insert(catalogClassRating)
        .values({ nameEs: `${RUN} Monomotores` })
        .returning()
    )[0]!.id

    const [license, permanentLicense] = await db
      .insert(licencia)
      .values([
        {
          personalId: people.ana,
          licenseTypeId: catalogs.licenseType,
          number: 'A-1',
          issueDate: day(-400),
          expiryDate: day(-5),
        },
        // D20: a license whose type does not expire never raises an alert.
        {
          personalId: people.ana,
          licenseTypeId: catalogs.permanentType,
          number: 'A-2',
          issueDate: day(-400),
          expiryDate: null,
        },
      ])
      .returning()
    ids.license = license!.id
    ids.permanentLicense = permanentLicense!.id
    ids.typeRating = (
      await db
        .insert(habilitacionTipo)
        .values({
          licenciaId: ids.license,
          typeRatingId: catalogs.typeRating,
          functionId: catalogs.fn,
          expiryDate: day(10),
        })
        .returning()
    )[0]!.id
    ids.classRating = (
      await db
        .insert(habilitacionClase)
        .values({ licenciaId: ids.license, classRatingId: catalogs.classRating, expiryDate: day(threshold + 60) })
        .returning()
    )[0]!.id
    const certs = await db
      .insert(certificadoMedico)
      .values([
        { personalId: people.ana, rav67Class: 'clase_1', number: 'M-1', issueDate: day(-300), expiryDate: day(0) },
        { personalId: people.beto, rav67Class: 'clase_3', number: 'M-2', issueDate: day(-300), expiryDate: day(-1) },
      ])
      .returning()
    ids.anaCert = certs[0]!.id
    ids.betoCert = certs[1]!.id
  })

  beforeEach(setBaseline)

  afterAll(async () => {
    await app.close()
    const personIds = Object.values(people)
    await db.delete(habilitacionTipo).where(eq(habilitacionTipo.id, ids.typeRating))
    await db.delete(habilitacionClase).where(eq(habilitacionClase.id, ids.classRating))
    await db.delete(licencia).where(inArray(licencia.personalId, personIds))
    await db.delete(certificadoMedico).where(inArray(certificadoMedico.personalId, personIds))
    await db.delete(personalAeronautico).where(inArray(personalAeronautico.id, personIds))
    await db
      .delete(catalogLicenseType)
      .where(inArray(catalogLicenseType.id, [catalogs.licenseType, catalogs.permanentType]))
    await db.delete(catalogTypeRating).where(eq(catalogTypeRating.id, catalogs.typeRating))
    await db.delete(catalogFunction).where(eq(catalogFunction.id, catalogs.fn))
    await db.delete(catalogClassRating).where(eq(catalogClassRating.id, catalogs.classRating))
    await deleteTestUsers(db, users)
    await pool.end()
  })

  it('requires a token on every alerts endpoint', async () => {
    await http().get('/api/alerts').expect(401)
    await http().get('/api/alerts/summary').expect(401)
    await http().post(`/api/alerts/${randomUUID()}/acknowledge`).expect(401)
  })

  it('validates the query and the id (400)', async () => {
    await http().get('/api/alerts').query({ kind: 'bloqueada' }).set(as(users.admin)).expect(400)
    await http().get('/api/alerts').query({ acknowledged: 'yes' }).set(as(users.admin)).expect(400)
    await http().get('/api/alerts/summary').query({ area: 'ambas' }).set(as(users.admin)).expect(400)
    await http().post('/api/alerts/not-a-uuid/acknowledge').set(as(users.admin)).expect(400)
  })

  it('recalculates on GET: expired and near-expiry credentials raise alerts, the rest do not (ALR-01, D6)', async () => {
    expect(
      await db
        .select()
        .from(alerta)
        .where(inArray(alerta.personalId, Object.values(people))),
    ).toHaveLength(0)

    const ana = await listFor(people.ana)
    expect(ana.items.map(keyOf).sort()).toEqual(
      [
        `licencia:${ids.license}:vencida`,
        `habilitacion_tipo:${ids.typeRating}:proxima`,
        // Expiring today is still near expiry, not expired (deriveCredentialStatus).
        `certificado_medico:${ids.anaCert}:proxima`,
      ].sort(),
    )
    const license = ana.items.find((a) => a.credentialId === ids.license)!
    expect(license).toMatchObject({
      personalId: people.ana,
      personnel: { firstNames: 'Ana', lastNames: `Alerta ${RUN}` },
      area: 'licencias',
      dueDate: day(-5),
      acknowledgedBy: null,
      acknowledgedAt: null,
    })
    expect(ana.items.find((a) => a.credentialId === ids.anaCert)!.area).toBe('medicina')
    // Licenses without expiry (D20) and credentials beyond the threshold raise nothing.
    expect(ana.items.some((a) => a.credentialId === ids.permanentLicense)).toBe(false)
    expect(ana.items.some((a) => a.credentialId === ids.classRating)).toBe(false)

    expect(await keysFor(people.beto)).toEqual([`certificado_medico:${ids.betoCert}:vencida`])
  })

  it('is idempotent: recalculating again keeps the same alerts and ids', async () => {
    const first = await listFor(people.ana)
    const second = await listFor(people.ana)
    expect(second.items.map((a) => a.id).sort()).toEqual(first.items.map((a) => a.id).sort())
    expect(await db.select().from(alerta).where(eq(alerta.personalId, people.ana))).toHaveLength(3)
  })

  it('follows the credentials: a renewal clears the alert and an expiry turns proxima into vencida', async () => {
    await listFor(people.ana)
    await db
      .update(licencia)
      .set({ expiryDate: day(365) })
      .where(eq(licencia.id, ids.license))
    await db
      .update(habilitacionTipo)
      .set({ expiryDate: day(-1) })
      .where(eq(habilitacionTipo.id, ids.typeRating))
    await db
      .update(habilitacionClase)
      .set({ expiryDate: day(threshold) })
      .where(eq(habilitacionClase.id, ids.classRating))

    expect(await keysFor(people.ana)).toEqual(
      [
        `habilitacion_tipo:${ids.typeRating}:vencida`,
        `habilitacion_clase:${ids.classRating}:proxima`,
        `certificado_medico:${ids.anaCert}:proxima`,
      ].sort(),
    )
  })

  it('filters by kind, area, credential kind and acknowledgement', async () => {
    expect(await keysFor(people.ana, { kind: 'vencida' })).toEqual([`licencia:${ids.license}:vencida`])
    expect(await keysFor(people.ana, { area: 'medicina' })).toEqual([`certificado_medico:${ids.anaCert}:proxima`])
    expect(await keysFor(people.ana, { area: 'licencias', kind: 'proxima' })).toEqual([
      `habilitacion_tipo:${ids.typeRating}:proxima`,
    ])
    expect(await keysFor(people.ana, { credentialKind: 'licencia' })).toEqual([`licencia:${ids.license}:vencida`])
    expect(await keysFor(people.ana, { acknowledged: 'true' })).toEqual([])
    expect(await keysFor(people.ana, { acknowledged: 'false' })).toHaveLength(3)
  })

  it('paginates, oldest due date first', async () => {
    const page1 = await http()
      .get('/api/alerts')
      .query({ personalId: people.ana, pageSize: '2', page: '1' })
      .set(as(users.admin))
      .expect(200)
    expect(page1.body).toMatchObject({ page: 1, pageSize: 2, total: 3 })
    expect(page1.body.items.map((a: Alert) => a.dueDate)).toEqual([day(-5), day(0)])
    const page2 = await http()
      .get('/api/alerts')
      .query({ personalId: people.ana, pageSize: '2', page: '2' })
      .set(as(users.admin))
      .expect(200)
    expect(page2.body.items.map((a: Alert) => a.dueDate)).toEqual([day(10)])
  })

  it('acknowledges an alert once, audited as reconocer in the same transaction (ALR-06, BR-11)', async () => {
    const target = (await listFor(people.ana, { kind: 'vencida' })).items[0]!
    const res = await http().post(`/api/alerts/${target.id}/acknowledge`).set(as(users.consulta)).expect(200)
    expect(res.body).toMatchObject({ id: target.id, acknowledgedBy: users.consulta.id })
    expect(Date.parse(res.body.acknowledgedAt)).not.toBeNaN()

    const audits = await ackAudits(target.id)
    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({ actorId: users.consulta.id, action: 'reconocer', entity: 'alerta' })
    expect(audits[0]!.changes).toMatchObject({
      before: { acknowledgedBy: null, acknowledgedAt: null },
      after: { acknowledgedBy: users.consulta.id },
    })

    // A second acknowledgement is a conflict and writes no audit row.
    await http().post(`/api/alerts/${target.id}/acknowledge`).set(as(users.admin)).expect(409)
    expect(await ackAudits(target.id)).toHaveLength(1)

    // The recalculation keeps the acknowledgement while the due date is the same.
    expect(await keysFor(people.ana, { acknowledged: 'true' })).toEqual([`licencia:${ids.license}:vencida`])
    expect(await keysFor(people.ana, { acknowledged: 'false' })).toHaveLength(2)
  })

  it('reopens an acknowledged alert when its due date changes', async () => {
    const target = (await listFor(people.ana, { kind: 'vencida' })).items[0]!
    await http().post(`/api/alerts/${target.id}/acknowledge`).set(as(users.admin)).expect(200)
    await db
      .update(licencia)
      .set({ expiryDate: day(-2) })
      .where(eq(licencia.id, ids.license))

    const after = (await listFor(people.ana, { credentialKind: 'licencia' })).items
    expect(after).toHaveLength(1)
    expect(after[0]).toMatchObject({ id: target.id, dueDate: day(-2), acknowledgedBy: null, acknowledgedAt: null })
  })

  it('answers 404 for an unknown alert and writes nothing', async () => {
    const id = randomUUID()
    await http().post(`/api/alerts/${id}/acknowledge`).set(as(users.admin)).expect(404)
    expect(await ackAudits(id)).toHaveLength(0)
  })

  it('summarises by kind, acknowledgement, credential kind and area, after recalculating', async () => {
    const res = await http()
      .get('/api/alerts/summary')
      .query({ personalId: people.ana })
      .set(as(users.consulta))
      .expect(200)
    expect(res.body).toEqual({
      total: 3,
      byKind: { vencida: 1, proxima: 2 },
      byAcknowledgement: { pending: 3, acknowledged: 0 },
      byCredentialKind: { licencia: 1, habilitacion_tipo: 1, habilitacion_clase: 0, certificado_medico: 1 },
      byArea: { licencias: 2, medicina: 1 },
    })

    const target = (await listFor(people.ana, { area: 'medicina' })).items[0]!
    await http().post(`/api/alerts/${target.id}/acknowledge`).set(as(users.admin)).expect(200)
    const pending = await http()
      .get('/api/alerts/summary')
      .query({ personalId: people.ana, acknowledged: 'false' })
      .set(as(users.admin))
      .expect(200)
    expect(pending.body).toMatchObject({
      total: 2,
      byAcknowledgement: { pending: 2, acknowledged: 0 },
      byArea: { licencias: 2, medicina: 0 },
    })
  })

  it('also recalculates from the daily job (D6)', async () => {
    // Imported after createTestApp, which resets the module registry, so the classes match the app's.
    const { SchedulerRegistry } = await import('@nestjs/schedule')
    const { AlertsDailyJob, ALERTS_DAILY_JOB } = await import('./infrastructure/alerts-daily-job.js')
    expect(app.get(SchedulerRegistry).getCronJob(ALERTS_DAILY_JOB)).toBeDefined()
    await app.get(AlertsDailyJob).run()
    const rows = await db.select().from(alerta).where(eq(alerta.personalId, people.beto))
    expect(rows.map((r) => `${r.credentialKind}:${r.kind}`)).toEqual(['certificado_medico:vencida'])
  })
})
