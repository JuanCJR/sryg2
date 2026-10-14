import type { INestApplication } from '@nestjs/common'
import { auditoria, createDb, parametroSistema, recursoGrafico } from '@sryg/db'
import { GRAPHIC_RESOURCE_MAX_BYTES, PLACEHOLDER_SETTINGS } from '@sryg/types'
import { and, eq, inArray } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../test/create-test-app'
import { createTestUsers, deleteTestUsers, type TestUser } from '../test/test-users'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)

// Fictitious image bytes: only the signature matters to the API.
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('logo-ficticio')])
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('firma-ficticia')])
const GIF = Buffer.from('GIF89a-no-admitido')

const MEDICAL_KEYS = [
  'medical.validity_months.clase_1',
  'medical.validity_months.clase_2',
  'medical.validity_months.clase_3',
]

describe('settings http (D3, D15, D18)', () => {
  let app: INestApplication
  let users: Record<'admin' | 'supervisor' | 'consulta', TestUser>
  // The settings are global rows: the suite snapshots and restores them.
  let savedParameters: Array<typeof parametroSistema.$inferSelect>
  let savedResources: Array<typeof recursoGrafico.$inferSelect>
  const http = () => request(app.getHttpServer())
  const as = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` })
  const auditRows = (entity: string) =>
    db
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.actorId, users.admin.id), eq(auditoria.entity, entity)))
      .orderBy(auditoria.id)
  const resetParameters = async () => {
    for (const [key, value] of Object.entries(PLACEHOLDER_SETTINGS))
      await db.update(parametroSistema).set({ value, isPlaceholder: true }).where(eq(parametroSistema.key, key))
  }

  beforeAll(async () => {
    savedParameters = await db.select().from(parametroSistema)
    savedResources = await db.select().from(recursoGrafico)
    await resetParameters()
    await db.delete(recursoGrafico)
    app = await createTestApp()
    users = await createTestUsers(db, app, {
      admin: { role: 'administrador', area: 'ambas' },
      supervisor: { role: 'supervisor', area: 'ambas' },
      consulta: { role: 'consulta', area: 'ambas' },
    })
  })
  afterAll(async () => {
    await app.close()
    for (const row of savedParameters)
      await db.update(parametroSistema).set(row).where(eq(parametroSistema.key, row.key))
    await db.delete(recursoGrafico)
    if (savedResources.length) await db.insert(recursoGrafico).values(savedResources)
    await deleteTestUsers(db, users)
    await pool.end()
  })

  describe('access', () => {
    const endpoints = [
      ['get', '/api/settings/parameters'],
      ['put', '/api/settings/parameters/alert-threshold'],
      ['put', '/api/settings/parameters/medical-validity'],
      ['get', '/api/settings/graphic-resources'],
      ['get', '/api/settings/graphic-resources/logo_inac'],
      ['put', '/api/settings/graphic-resources/logo_inac'],
    ] as const

    it('requires a token', async () => {
      for (const [method, url] of endpoints) await http()[method](url).expect(401)
    })

    it('is Admin only: Supervisor and Consulta get 403 and nothing is written', async () => {
      for (const user of [users.supervisor, users.consulta])
        for (const [method, url] of endpoints) {
          const call = http()[method](url).set(as(user))
          if (method === 'get') await call.expect(403)
          else if (url.endsWith('alert-threshold')) await call.send({ days: 10 }).expect(403)
          else if (method === 'put' && url.includes('graphic')) await call.type('image/png').send(PNG).expect(403)
          else await call.send({ clase_1: 1, clase_2: 1, clase_3: 1 }).expect(403)
        }
      expect(await db.select().from(recursoGrafico)).toHaveLength(0)
      const thresholdRow = await db
        .select()
        .from(parametroSistema)
        .where(eq(parametroSistema.key, 'alerts.threshold_days'))
      expect(thresholdRow[0]).toMatchObject({ value: 30, isPlaceholder: true })
    })
  })

  describe('parameters', () => {
    it('reads the threshold and the RAV 67 validity, flagged as placeholders until saved', async () => {
      const res = await http().get('/api/settings/parameters').set(as(users.admin)).expect(200)
      expect(res.body).toMatchObject({
        alertThresholdDays: { value: 30, isPlaceholder: true },
        medicalValidityMonths: {
          clase_1: { value: 12, isPlaceholder: true },
          clase_2: { value: 12, isPlaceholder: true },
          clase_3: { value: 12, isPlaceholder: true },
        },
      })
      expect(typeof res.body.alertThresholdDays.updatedAt).toBe('string')
    })

    it('rejects an invalid threshold with 400 and writes nothing', async () => {
      const before = (await auditRows('parametro_sistema')).length
      for (const body of [{ days: 0 }, { days: 1.5 }, { days: '30' }, {}])
        await http().put('/api/settings/parameters/alert-threshold').set(as(users.admin)).send(body).expect(400)
      expect(await auditRows('parametro_sistema')).toHaveLength(before)
    })

    it('saves the threshold, clears the placeholder mark and writes one audit row', async () => {
      const before = (await auditRows('parametro_sistema')).length
      const res = await http()
        .put('/api/settings/parameters/alert-threshold')
        .set(as(users.admin))
        .send({ days: 45 })
        .expect(200)
      expect(res.body.alertThresholdDays).toMatchObject({ value: 45, isPlaceholder: false })
      expect(res.body.medicalValidityMonths.clase_1).toMatchObject({ value: 12, isPlaceholder: true })

      const [row] = await db.select().from(parametroSistema).where(eq(parametroSistema.key, 'alerts.threshold_days'))
      expect(row).toMatchObject({ value: 45, isPlaceholder: false, updatedBy: users.admin.id })
      const audit = await auditRows('parametro_sistema')
      expect(audit).toHaveLength(before + 1)
      expect(audit.at(-1)).toMatchObject({
        action: 'actualizar',
        entityId: null,
        changes: {
          before: { 'alerts.threshold_days': { value: 30, isPlaceholder: true } },
          after: { 'alerts.threshold_days': { value: 45, isPlaceholder: false } },
        },
      })
    })

    it('confirms a placeholder value as is, but does not audit saving an unchanged real value', async () => {
      await resetParameters()
      const before = (await auditRows('parametro_sistema')).length
      const confirmed = await http()
        .put('/api/settings/parameters/alert-threshold')
        .set(as(users.admin))
        .send({ days: 30 })
        .expect(200)
      expect(confirmed.body.alertThresholdDays).toMatchObject({ value: 30, isPlaceholder: false })
      expect(await auditRows('parametro_sistema')).toHaveLength(before + 1)

      await http().put('/api/settings/parameters/alert-threshold').set(as(users.admin)).send({ days: 30 }).expect(200)
      expect(await auditRows('parametro_sistema')).toHaveLength(before + 1)
    })

    it('saves the validity of the three RAV 67 classes in one audited write', async () => {
      const before = (await auditRows('parametro_sistema')).length
      await http()
        .put('/api/settings/parameters/medical-validity')
        .set(as(users.admin))
        .send({ clase_1: 6, clase_2: 12 })
        .expect(400)
      const res = await http()
        .put('/api/settings/parameters/medical-validity')
        .set(as(users.admin))
        .send({ clase_1: 6, clase_2: 12, clase_3: 24 })
        .expect(200)
      expect(res.body.medicalValidityMonths).toMatchObject({
        clase_1: { value: 6, isPlaceholder: false },
        clase_2: { value: 12, isPlaceholder: false },
        clase_3: { value: 24, isPlaceholder: false },
      })
      const rows = await db.select().from(parametroSistema).where(inArray(parametroSistema.key, MEDICAL_KEYS))
      expect(rows.every((r) => !r.isPlaceholder && r.updatedBy === users.admin.id)).toBe(true)
      const audit = await auditRows('parametro_sistema')
      expect(audit).toHaveLength(before + 1)
      expect(audit.at(-1)?.changes).toEqual({
        before: {
          'medical.validity_months.clase_1': { value: 12, isPlaceholder: true },
          'medical.validity_months.clase_2': { value: 12, isPlaceholder: true },
          'medical.validity_months.clase_3': { value: 12, isPlaceholder: true },
        },
        after: {
          'medical.validity_months.clase_1': { value: 6, isPlaceholder: false },
          'medical.validity_months.clase_2': { value: 12, isPlaceholder: false },
          'medical.validity_months.clase_3': { value: 24, isPlaceholder: false },
        },
      })
    })
  })

  describe('graphic resources', () => {
    it('lists both resources as not configured while INAC has not supplied them, and 404s their bytes', async () => {
      const res = await http().get('/api/settings/graphic-resources').set(as(users.admin)).expect(200)
      expect(res.body).toEqual([
        { kind: 'logo_inac', configured: false, mime: null, size: null, updatedAt: null },
        { kind: 'firma_presidente', configured: false, mime: null, size: null, updatedAt: null },
      ])
      await http().get('/api/settings/graphic-resources/logo_inac').set(as(users.admin)).expect(404)
    })

    it('rejects an unknown kind with 400', async () => {
      await http().get('/api/settings/graphic-resources/escudo').set(as(users.admin)).expect(400)
      await http()
        .put('/api/settings/graphic-resources/escudo')
        .set(as(users.admin))
        .type('image/png')
        .send(PNG)
        .expect(400)
    })

    it('rejects anything but PNG or JPEG with 415, including a mislabeled file, and writes nothing', async () => {
      const before = (await auditRows('recurso_grafico')).length
      const put = () => http().put('/api/settings/graphic-resources/logo_inac').set(as(users.admin))
      await put().type('image/gif').send(GIF).expect(415)
      await put().type('image/png').send(GIF).expect(415)
      await put().type('image/png').send(JPEG).expect(415)
      await put().send({ data: 'no' }).expect(415)
      expect(await db.select().from(recursoGrafico)).toHaveLength(0)
      expect(await auditRows('recurso_grafico')).toHaveLength(before)
    })

    it('rejects an empty body with 400 and an image over 500 KB with 413', async () => {
      const put = () => http().put('/api/settings/graphic-resources/logo_inac').set(as(users.admin)).type('image/png')
      await put().send(Buffer.alloc(0)).expect(400)
      const big = Buffer.concat([PNG, Buffer.alloc(GRAPHIC_RESOURCE_MAX_BYTES + 1 - PNG.length)])
      const res = await put().send(big)
      expect(res.status).toBe(413)
      const atLimit = Buffer.concat([PNG, Buffer.alloc(GRAPHIC_RESOURCE_MAX_BYTES - PNG.length)])
      await put().send(atLimit).expect(200)
      await db.delete(recursoGrafico)
    })

    it('stores an image, serves it back byte for byte and audits create then update without the bytes', async () => {
      const before = (await auditRows('recurso_grafico')).length
      const created = await http()
        .put('/api/settings/graphic-resources/firma_presidente')
        .set(as(users.admin))
        .type('image/png')
        .send(PNG)
        .expect(200)
      expect(created.body).toMatchObject({
        kind: 'firma_presidente',
        configured: true,
        mime: 'image/png',
        size: PNG.length,
      })

      const bytes = await http()
        .get('/api/settings/graphic-resources/firma_presidente')
        .set(as(users.admin))
        .buffer(true)
        .parse((res, done) => {
          const chunks: Buffer[] = []
          res.on('data', (c: Buffer) => chunks.push(c))
          res.on('end', () => done(null, Buffer.concat(chunks)))
        })
        .expect(200)
      expect(bytes.headers['content-type']).toBe('image/png')
      expect(Buffer.compare(bytes.body as Buffer, PNG)).toBe(0)

      await http()
        .put('/api/settings/graphic-resources/firma_presidente')
        .set(as(users.admin))
        .type('image/jpeg')
        .send(JPEG)
        .expect(200)
      const list = await http().get('/api/settings/graphic-resources').set(as(users.admin)).expect(200)
      expect(list.body[1]).toMatchObject({ kind: 'firma_presidente', configured: true, mime: 'image/jpeg' })
      expect(list.body[0]).toMatchObject({ kind: 'logo_inac', configured: false })

      const audit = (await auditRows('recurso_grafico')).slice(before)
      expect(audit.map((a) => a.action)).toEqual(['crear', 'actualizar'])
      expect(audit[0]?.changes).toEqual({ after: { kind: 'firma_presidente', mime: 'image/png', size: PNG.length } })
      expect(audit[1]?.changes).toEqual({
        before: { kind: 'firma_presidente', mime: 'image/png', size: PNG.length },
        after: { kind: 'firma_presidente', mime: 'image/jpeg', size: JPEG.length },
      })
    })
  })
})
