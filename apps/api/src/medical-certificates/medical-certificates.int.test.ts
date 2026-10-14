import { randomInt, randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import {
  auditoria,
  bloqueo,
  catalogMedicalObservation,
  certificadoMedico,
  createDb,
  parametroSistema,
  personalAeronautico,
} from '@sryg/db'
import { ALERT_THRESHOLD_KEY, MEDICAL_VALIDITY_KEYS, medicalExpiryDate } from '@sryg/types'
import { and, eq, inArray, like, sql } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../test/create-test-app'
import { createTestUsers, deleteTestUsers, type TestUser } from '../test/test-users'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)
// Run-unique fictitious data, so the assertions ignore whatever else the database holds.
const RUN = `zz${randomUUID().slice(0, 8)}`
const CEDULA = String(randomInt(10_000_000, 49_999_999))
const BLOCKED_CEDULA = String(Number(CEDULA) + 50_000_000)
const ENTITY = 'certificado_medico'

const DAY_MS = 86_400_000
const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10)

type UserKey = 'admin' | 'medicina' | 'licencias' | 'consulta'

describe('medical certificates http (MED-01..07)', () => {
  let app: INestApplication
  let users: Record<UserKey, TestUser>
  let personId: string
  let blockedPersonId: string
  let blockedCertificateId: string
  let observationIds: [string, string]
  let inactiveObservationId: string
  let validityMonths: number
  let thresholdDays: number

  const http = () => request(app.getHttpServer())
  const as = (key: UserKey) => ({ Authorization: `Bearer ${users[key].token}` })
  const register = (key: UserKey, personalId: string, body: Record<string, unknown>) =>
    http().post(`/api/personnel/${personalId}/medical-certificates`).set(as(key)).send(body)
  const certificatesOf = async (personalId: string) =>
    db.select().from(certificadoMedico).where(eq(certificadoMedico.personalId, personalId))
  const auditRows = async (entityId?: string) =>
    db
      .select()
      .from(auditoria)
      .where(
        and(
          eq(auditoria.entity, ENTITY),
          inArray(
            auditoria.actorId,
            Object.values(users).map((u) => u.id),
          ),
          entityId ? eq(auditoria.entityId, entityId) : undefined,
        ),
      )
      .orderBy(auditoria.id)

  beforeAll(async () => {
    app = await createTestApp()
    users = await createTestUsers(db, app, {
      admin: { role: 'administrador', area: 'licencias' },
      medicina: { role: 'supervisor', area: 'medicina' },
      licencias: { role: 'supervisor', area: 'licencias' },
      consulta: { role: 'consulta', area: 'ambas' },
    })
    const createdBy = { createdBy: users.admin.id, updatedBy: users.admin.id }
    const [person, blocked] = await db
      .insert(personalAeronautico)
      .values([
        { cedula: CEDULA, firstNames: 'Persona', lastNames: `Ficticia ${RUN}`, ...createdBy },
        { cedula: BLOCKED_CEDULA, firstNames: 'Persona', lastNames: `Bloqueada ${RUN}`, ...createdBy },
      ])
      .returning({ id: personalAeronautico.id })
    personId = person!.id
    blockedPersonId = blocked!.id
    await db.insert(bloqueo).values({
      personalId: blockedPersonId,
      type: 'medico',
      reason: 'Impedimento ficticio de prueba',
      createdBy: users.admin.id,
    })
    const [cert] = await db
      .insert(certificadoMedico)
      .values({
        personalId: blockedPersonId,
        rav67Class: 'clase_3',
        number: BLOCKED_CEDULA,
        issueDate: isoDay(-100),
        expiryDate: isoDay(200),
      })
      .returning({ id: certificadoMedico.id })
    blockedCertificateId = cert!.id
    const observations = await db
      .insert(catalogMedicalObservation)
      .values([
        { nameEs: `${RUN} Debe usar lentes correctivos`, nameEn: `${RUN} Shall wear corrective lenses` },
        { nameEs: `${RUN} Válido solo como copiloto`, nameEn: `${RUN} Valid only as co-pilot` },
        { nameEs: `${RUN} Observación retirada`, nameEn: null, active: false },
      ])
      .returning({ id: catalogMedicalObservation.id })
    observationIds = [observations[0]!.id, observations[1]!.id]
    inactiveObservationId = observations[2]!.id
    const params = await db
      .select()
      .from(parametroSistema)
      .where(inArray(parametroSistema.key, [MEDICAL_VALIDITY_KEYS.clase_2, ALERT_THRESHOLD_KEY]))
    validityMonths = params.find((p) => p.key === MEDICAL_VALIDITY_KEYS.clase_2)!.value as number
    thresholdDays = params.find((p) => p.key === ALERT_THRESHOLD_KEY)!.value as number
  })

  afterAll(async () => {
    await app.close()
    await db.delete(certificadoMedico).where(inArray(certificadoMedico.personalId, [personId, blockedPersonId]))
    await db.delete(bloqueo).where(eq(bloqueo.personalId, blockedPersonId))
    await db.delete(personalAeronautico).where(inArray(personalAeronautico.id, [personId, blockedPersonId]))
    await db.delete(catalogMedicalObservation).where(like(catalogMedicalObservation.nameEs, `${RUN}%`))
    await deleteTestUsers(db, users)
    await pool.end()
  })

  it('requires a token on every endpoint', async () => {
    const id = randomUUID()
    await http().get(`/api/personnel/${id}/medical-certificates`).expect(401)
    await http().post(`/api/personnel/${id}/medical-certificates`).send({}).expect(401)
    await http().get(`/api/medical-certificates/${id}`).expect(401)
    await http().post(`/api/medical-certificates/${id}/renew`).send({}).expect(401)
    await http().get(`/api/medical-certificates/${id}/history`).expect(401)
    await http().get('/api/medical-certificates/validity').expect(401)
  })

  it('lets only the Admin and the Medicina Supervisor write (D24): 403 for the others, nothing written', async () => {
    const body = { rav67Class: 'clase_2', issueDate: isoDay(0) }
    await register('consulta', personId, body).expect(403)
    await register('licencias', personId, body).expect(403)
    await http()
      .post(`/api/medical-certificates/${blockedCertificateId}/renew`)
      .set(as('licencias'))
      .send({ issueDate: isoDay(0) })
      .expect(403)
    expect(await certificatesOf(personId)).toHaveLength(0)
    expect(await auditRows()).toHaveLength(0)
    await http().get(`/api/personnel/${personId}/medical-certificates`).set(as('consulta')).expect(200)
    await http().get(`/api/personnel/${personId}/medical-certificates`).set(as('licencias')).expect(200)
  })

  it('rejects invalid bodies, clinical fields and unknown or inactive observations with 400', async () => {
    const base = { rav67Class: 'clase_2', issueDate: isoDay(0) }
    await register('medicina', personId, { ...base, rav67Class: 'clase_4' }).expect(400)
    await register('medicina', personId, { ...base, diagnosis: 'Dato clínico ficticio' }).expect(400)
    await register('medicina', personId, { ...base, expiryDate: isoDay(9000) }).expect(400)
    await register('medicina', personId, { ...base, observationIds: [randomUUID()] }).expect(400)
    await register('medicina', personId, { ...base, observationIds: [inactiveObservationId] }).expect(400)
    await http().get('/api/personnel/not-a-uuid/medical-certificates').set(as('admin')).expect(400)
    expect(await certificatesOf(personId)).toHaveLength(0)
    expect(await auditRows()).toHaveLength(0)
  })

  it('answers 404 for an unknown person', async () => {
    await register('medicina', randomUUID(), { rav67Class: 'clase_2', issueDate: isoDay(0) }).expect(404)
    await http().get(`/api/personnel/${randomUUID()}/medical-certificates`).set(as('admin')).expect(404)
  })

  it('registers with the document as number (D22), the expiry from the class validity (D3) and one emitir row', async () => {
    const issueDate = isoDay(0)
    const res = await register('medicina', personId, {
      rav67Class: 'clase_2',
      issueDate,
      observationIds: observationIds,
      restrictions: 'No apto para vuelo nocturno',
    }).expect(201)
    expect(res.body).toEqual({
      id: expect.any(String),
      personalId: personId,
      rav67Class: 'clase_2',
      number: CEDULA,
      issueDate,
      expiryDate: medicalExpiryDate(issueDate, validityMonths),
      restrictions: 'No apto para vuelo nocturno',
      observations: expect.arrayContaining([
        { id: observationIds[0], nameEs: `${RUN} Debe usar lentes correctivos`, nameEn: expect.any(String) },
        { id: observationIds[1], nameEs: `${RUN} Válido solo como copiloto`, nameEn: expect.any(String) },
      ]),
      status: validityMonths * 30 > thresholdDays ? 'vigente' : 'proxima_a_vencer',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })
    const rows = await auditRows(res.body.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ actorId: users.medicina.id, action: 'emitir', entity: ENTITY })
    expect(rows[0]!.changes?.after).toMatchObject({ rav67Class: 'clase_2', number: CEDULA, issueDate })
  })

  it('takes an explicit number from the Admin and derives vencida / proxima_a_vencer from the dates', async () => {
    const expired = await register('admin', personId, {
      rav67Class: 'clase_1',
      number: 'MED-FICT-001',
      issueDate: isoDay(-3000),
    }).expect(201)
    expect(expired.body).toMatchObject({ number: 'MED-FICT-001', status: 'vencida', restrictions: null })
    expect(expired.body.observations).toEqual([])

    // The latest issue date whose expiry still falls inside the threshold.
    let offset = 0
    while (medicalExpiryDate(isoDay(offset), validityMonths) > isoDay(thresholdDays)) offset -= 1
    const nearExpiry = await register('admin', personId, { rav67Class: 'clase_2', issueDate: isoDay(offset) })
    expect(nearExpiry.status).toBe(201)
    expect(nearExpiry.body.status).toBe('proxima_a_vencer')
  })

  it('blocks registration while the person has an active block (BR-07): 409 with a reason, nothing written', async () => {
    const before = (await certificatesOf(blockedPersonId)).length
    const res = await register('admin', blockedPersonId, { rav67Class: 'clase_3', issueDate: isoDay(0) }).expect(409)
    expect(res.body).toMatchObject({ statusCode: 409, error: 'Conflict', message: expect.stringMatching(/bloqueo/i) })
    expect(await certificatesOf(blockedPersonId)).toHaveLength(before)
    await http()
      .post(`/api/medical-certificates/${blockedCertificateId}/renew`)
      .set(as('medicina'))
      .send({ issueDate: isoDay(0) })
      .expect(409)
    const [unchanged] = await db.select().from(certificadoMedico).where(eq(certificadoMedico.id, blockedCertificateId))
    expect(unchanged?.issueDate).toBe(isoDay(-100))
    expect(await auditRows(blockedCertificateId)).toHaveLength(0)
  })

  it('lists the person certificates newest first, with the block flag, the threshold and derived statuses', async () => {
    const res = await http().get(`/api/personnel/${personId}/medical-certificates`).set(as('consulta')).expect(200)
    expect(res.body).toMatchObject({
      personalId: personId,
      hasActiveBlock: false,
      alertThresholdDays: { value: thresholdDays, isPlaceholder: expect.any(Boolean) },
    })
    expect(res.body.items.map((c: { rav67Class: string }) => c.rav67Class)).toEqual(['clase_2', 'clase_2', 'clase_1'])

    const blocked = await http()
      .get(`/api/personnel/${blockedPersonId}/medical-certificates`)
      .set(as('consulta'))
      .expect(200)
    expect(blocked.body.hasActiveBlock).toBe(true)
    expect(blocked.body.items).toEqual([expect.objectContaining({ id: blockedCertificateId, status: 'bloqueada' })])
  })

  it('renews keeping class and observations, recomputing expiry, and writes one renovar row with before/after', async () => {
    const list = await http().get(`/api/personnel/${personId}/medical-certificates`).set(as('admin')).expect(200)
    const current = list.body.items[0]
    const issueDate = isoDay(1)
    const res = await http()
      .post(`/api/medical-certificates/${current.id}/renew`)
      .set(as('medicina'))
      .send({ issueDate, restrictions: '' })
      .expect(200)
    expect(res.body).toMatchObject({
      id: current.id,
      rav67Class: 'clase_2',
      number: CEDULA,
      issueDate,
      expiryDate: medicalExpiryDate(issueDate, validityMonths),
      restrictions: null,
    })
    expect(res.body.observations).toHaveLength(2)
    const rows = await auditRows(current.id)
    expect(rows.map((r) => r.action)).toEqual(['emitir', 'renovar'])
    expect(rows[1]).toMatchObject({ actorId: users.medicina.id })
    expect(rows[1]!.changes).toMatchObject({
      before: { issueDate: current.issueDate, restrictions: 'No apto para vuelo nocturno' },
      after: { issueDate, restrictions: null },
    })

    const narrowed = await http()
      .post(`/api/medical-certificates/${current.id}/renew`)
      .set(as('admin'))
      .send({ issueDate, observationIds: [observationIds[1]] })
      .expect(200)
    expect(narrowed.body.observations).toEqual([expect.objectContaining({ id: observationIds[1] })])

    await http()
      .post(`/api/medical-certificates/${randomUUID()}/renew`)
      .set(as('admin'))
      .send({ issueDate })
      .expect(404)
    await http()
      .post(`/api/medical-certificates/${current.id}/renew`)
      .set(as('admin'))
      .send({ issueDate, rav67Class: 'clase_1' })
      .expect(400)
  })

  it('reads one certificate and its history (MED-07); the history needs audit access', async () => {
    const list = await http().get(`/api/personnel/${personId}/medical-certificates`).set(as('admin')).expect(200)
    const id: string = list.body.items[0].id
    const one = await http().get(`/api/medical-certificates/${id}`).set(as('consulta')).expect(200)
    expect(one.body).toMatchObject({ id, personalId: personId })
    await http().get(`/api/medical-certificates/${randomUUID()}`).set(as('consulta')).expect(404)

    const history = await http().get(`/api/medical-certificates/${id}/history`).set(as('licencias')).expect(200)
    expect(history.body.map((e: { action: string }) => e.action)).toEqual(['renovar', 'renovar', 'emitir'])
    expect(history.body[2]).toMatchObject({
      actor: { id: users.medicina.id, fullName: 'Test medicina' },
      occurredAt: expect.any(String),
    })
    await http().get(`/api/medical-certificates/${id}/history`).set(as('consulta')).expect(403)
    await http().get(`/api/medical-certificates/${randomUUID()}/history`).set(as('admin')).expect(404)
  })

  it('exposes the validity of each RAV 67 class with its PENDIENTE INAC flag (D3)', async () => {
    const res = await http().get('/api/medical-certificates/validity').set(as('consulta')).expect(200)
    expect(Object.keys(res.body).sort()).toEqual(['clase_1', 'clase_2', 'clase_3'])
    expect(res.body.clase_2).toEqual({ value: validityMonths, isPlaceholder: expect.any(Boolean) })
  })

  it('has no clinical column in the certificate tables (MED-04, BR-05)', async () => {
    const columns = await db.execute<{ table_name: string; column_name: string }>(sql`
      select table_name, column_name from information_schema.columns
      where table_name in ('certificado_medico', 'certificado_observacion') order by table_name, column_name`)
    expect(columns.rows.map((c) => `${c.table_name}.${c.column_name}`)).toEqual([
      'certificado_medico.created_at',
      'certificado_medico.expiry_date',
      'certificado_medico.id',
      'certificado_medico.issue_date',
      'certificado_medico.number',
      'certificado_medico.personal_id',
      'certificado_medico.rav67_class',
      'certificado_medico.restrictions',
      'certificado_medico.status',
      'certificado_medico.updated_at',
      'certificado_medico.verification_token',
      'certificado_observacion.certificado_medico_id',
      'certificado_observacion.observation_id',
    ])
  })
})
