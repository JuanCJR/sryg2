import { randomInt, randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import {
  ALERT_THRESHOLD_KEY,
  type ConsolidatedReportRow,
  type ExpiryReportRow,
  type ActiveBlockReportRow,
} from '@sryg/types'
import {
  auditoria,
  bloqueo,
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
import { and, eq, inArray } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../test/create-test-app'
import { createTestUsers, deleteTestUsers, type TestUser } from '../test/test-users'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)
// Every fixture carries RUN in its last name, so `q=RUN` isolates this suite from other data.
const RUN = `Rep${randomUUID().slice(0, 8)}`

const DAY_MS = 86_400_000
const todayUtc = Math.floor(Date.now() / DAY_MS) * DAY_MS
const day = (offset: number) => new Date(todayUtc + offset * DAY_MS).toISOString().slice(0, 10)

type PersonKey = 'vencido' | 'proximo' | 'vigente' | 'bloqueado' | 'sinCredenciales' | 'permanente'
const LAST_NAMES: Record<PersonKey, string> = {
  vencido: `${RUN} Alfa`,
  proximo: `${RUN} Bravo`,
  vigente: `${RUN} Charlie`,
  bloqueado: `${RUN} Delta`,
  sinCredenciales: `${RUN} Echo`,
  permanente: `${RUN} Foxtrot`,
}

describe('reports http (D10)', () => {
  let app: INestApplication
  let users: Record<'admin' | 'supLic' | 'supMed' | 'consulta', TestUser>
  let threshold: number
  const people = {} as Record<PersonKey, { id: string; cedula: string }>
  const ids = {
    types: {} as Record<'comercial' | 'controlador' | 'permanente', string>,
    licenses: {} as Record<'vencido' | 'proximo' | 'vigente' | 'bloqueado' | 'permanente', string>,
    typeRating: '',
    function: '',
    classRating: '',
    habTipo: '',
    habClase: '',
    certNear: '',
    certOld: '',
    certFar: '',
    blockActive: '',
  }

  const http = () => request(app.getHttpServer())
  const as = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` })
  const report = (user: TestUser, id: string, query: Record<string, string> = {}) =>
    http()
      .get(`/api/reports/${id}`)
      .query({ q: RUN, ...query })
      .set(as(user))
  const exportsBy = async (actorId: string) =>
    db
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.actorId, actorId), eq(auditoria.action, 'exportar')))

  beforeAll(async () => {
    app = await createTestApp()
    users = await createTestUsers(db, app, {
      admin: { role: 'administrador', area: 'ambas' },
      supLic: { role: 'supervisor', area: 'licencias' },
      supMed: { role: 'supervisor', area: 'medicina' },
      consulta: { role: 'consulta', area: 'licencias' },
    })
    const [param] = await db.select().from(parametroSistema).where(eq(parametroSistema.key, ALERT_THRESHOLD_KEY))
    threshold = param!.value as number
    expect(threshold).toBeGreaterThanOrEqual(10)

    const actor = users.admin.id
    for (const key of Object.keys(LAST_NAMES) as PersonKey[]) {
      const cedula = String(randomInt(10_000_000, 99_999_999))
      const [row] = await db
        .insert(personalAeronautico)
        .values({ cedula, firstNames: 'Prueba', lastNames: LAST_NAMES[key], createdBy: actor, updatedBy: actor })
        .returning()
      people[key] = { id: row!.id, cedula }
    }
    const types = await db
      .insert(catalogLicenseType)
      .values([
        { nameEs: `${RUN} Piloto Comercial`, rav60Category: 'piloto_comercial', validityMonths: 12 },
        { nameEs: `${RUN} Controlador`, rav60Category: 'controlador_transito_aereo', validityMonths: 24 },
        { nameEs: `${RUN} Técnico`, rav60Category: 'tecnico_mantenimiento', appliesExpiry: false },
      ])
      .returning()
    ids.types = { comercial: types[0]!.id, controlador: types[1]!.id, permanente: types[2]!.id }
    ids.typeRating = (
      await db
        .insert(catalogTypeRating)
        .values({ nameEs: `${RUN} B737` })
        .returning()
    )[0]!.id
    ids.function = (
      await db
        .insert(catalogFunction)
        .values({ nameEs: `${RUN} Capitán` })
        .returning()
    )[0]!.id
    ids.classRating = (
      await db
        .insert(catalogClassRating)
        .values({ nameEs: `${RUN} Monomotores` })
        .returning()
    )[0]!.id

    const license = async (person: PersonKey, typeId: string, issue: number, expiry: number | null) =>
      (
        await db
          .insert(licencia)
          .values({
            personalId: people[person].id,
            licenseTypeId: typeId,
            number: people[person].cedula,
            issueDate: day(issue),
            expiryDate: expiry === null ? null : day(expiry),
          })
          .returning()
      )[0]!.id
    ids.licenses = {
      vencido: await license('vencido', ids.types.comercial, -375, -10),
      proximo: await license('proximo', ids.types.comercial, -355, 10),
      vigente: await license('vigente', ids.types.controlador, -30, threshold + 100),
      bloqueado: await license('bloqueado', ids.types.comercial, -368, -3),
      permanente: await license('permanente', ids.types.permanente, -900, null),
    }
    ids.habTipo = (
      await db
        .insert(habilitacionTipo)
        .values({
          licenciaId: ids.licenses.proximo,
          typeRatingId: ids.typeRating,
          functionId: ids.function,
          expiryDate: day(-1),
        })
        .returning()
    )[0]!.id
    ids.habClase = (
      await db
        .insert(habilitacionClase)
        .values({ licenciaId: ids.licenses.proximo, classRatingId: ids.classRating, expiryDate: day(threshold + 200) })
        .returning()
    )[0]!.id
    const cert = async (person: PersonKey, issue: number, expiry: number) =>
      (
        await db
          .insert(certificadoMedico)
          .values({
            personalId: people[person].id,
            rav67Class: 'clase_1',
            number: people[person].cedula,
            issueDate: day(issue),
            expiryDate: day(expiry),
          })
          .returning()
      )[0]!.id
    // Superseded by the renewal below: it must not count as an expired credential.
    ids.certOld = await cert('vencido', -800, -400)
    ids.certNear = await cert('vencido', -360, 5)
    ids.certFar = await cert('vigente', -10, threshold + 300)

    const [block] = await db
      .insert(bloqueo)
      .values({
        personalId: people.bloqueado.id,
        type: 'medico',
        reason: '=Impedimento ficticio',
        createdBy: actor,
      })
      .returning()
    ids.blockActive = block!.id
    await db.insert(bloqueo).values({
      personalId: people.vigente.id,
      type: 'administrativo',
      reason: 'Ya resuelto',
      status: 'resuelto',
      createdBy: actor,
      resolvedBy: actor,
      resolvedAt: new Date(),
      resolutionNote: 'Resuelto en prueba',
    })
  })

  afterAll(async () => {
    await app.close()
    const personIds = Object.values(people).map((p) => p.id)
    const licenseIds = Object.values(ids.licenses)
    await db.delete(habilitacionTipo).where(inArray(habilitacionTipo.licenciaId, licenseIds))
    await db.delete(habilitacionClase).where(inArray(habilitacionClase.licenciaId, licenseIds))
    await db.delete(licencia).where(inArray(licencia.id, licenseIds))
    await db.delete(certificadoMedico).where(inArray(certificadoMedico.personalId, personIds))
    await db.delete(bloqueo).where(inArray(bloqueo.personalId, personIds))
    await db.delete(personalAeronautico).where(inArray(personalAeronautico.id, personIds))
    await db.delete(catalogLicenseType).where(inArray(catalogLicenseType.id, Object.values(ids.types)))
    await db.delete(catalogTypeRating).where(eq(catalogTypeRating.id, ids.typeRating))
    await db.delete(catalogFunction).where(eq(catalogFunction.id, ids.function))
    await db.delete(catalogClassRating).where(eq(catalogClassRating.id, ids.classRating))
    await deleteTestUsers(db, users)
    await pool.end()
  })

  it('requires a token, a known report and a valid range', async () => {
    await http().get('/api/reports/vencimientos').expect(401)
    await http().get('/api/reports/vencimientos/export').query({ format: 'csv' }).expect(401)
    await http().get('/api/reports/inexistente').set(as(users.admin)).expect(400)
    await report(users.admin, 'vencimientos', { from: day(5), to: day(1) }).expect(400)
    await report(users.admin, 'vencimientos', { status: 'activa' }).expect(400)
    await http().get('/api/reports/vencimientos/export').set(as(users.admin)).expect(400)
  })

  describe('report 1: expired and near-expiry credentials', () => {
    it('lists the current credentials that are expired or near expiry, soonest first, with their derived status', async () => {
      const { body } = await report(users.admin, 'vencimientos').expect(200)
      expect(body).toMatchObject({ report: 'vencimientos', thresholdDays: threshold, today: day(0), total: 5 })
      const rows = body.items as ExpiryReportRow[]
      expect(rows.map((r) => [r.credentialKind, r.credentialId, r.status, r.daysRemaining])).toEqual([
        ['licencia', ids.licenses.vencido, 'vencida', -10],
        ['licencia', ids.licenses.bloqueado, 'bloqueada', -3],
        ['habilitacion_tipo', ids.habTipo, 'vencida', -1],
        ['certificado_medico', ids.certNear, 'proxima_a_vencer', 5],
        ['licencia', ids.licenses.proximo, 'proxima_a_vencer', 10],
      ])
      expect(rows[0]).toEqual({
        personalId: people.vencido.id,
        cedula: people.vencido.cedula,
        fullName: `Prueba ${LAST_NAMES.vencido}`,
        credentialKind: 'licencia',
        credentialId: ids.licenses.vencido,
        description: `${RUN} Piloto Comercial`,
        licenseTypeName: `${RUN} Piloto Comercial`,
        rav60Category: 'piloto_comercial',
        number: people.vencido.cedula,
        expiryDate: day(-10),
        daysRemaining: -10,
        status: 'vencida',
      })
      expect(rows[2]).toMatchObject({
        description: `${RUN} B737 · ${RUN} Capitán`,
        licenseTypeName: `${RUN} Piloto Comercial`,
        number: people.proximo.cedula,
      })
      expect(rows[3]).toMatchObject({ description: 'Clase 1', licenseTypeName: null, rav60Category: null })
    })

    it('filters by status, license type, RAV 60 category and expiry range', async () => {
      const kinds = async (query: Record<string, string>) =>
        ((await report(users.admin, 'vencimientos', query).expect(200)).body.items as ExpiryReportRow[]).map(
          (r) => r.credentialId,
        )
      expect(await kinds({ status: 'vencida' })).toEqual([ids.licenses.vencido, ids.habTipo])
      expect(await kinds({ status: 'bloqueada' })).toEqual([ids.licenses.bloqueado])
      // Medical certificates have no license type: a type or category filter leaves them out.
      expect(await kinds({ licenseTypeId: ids.types.comercial })).toEqual([
        ids.licenses.vencido,
        ids.licenses.bloqueado,
        ids.habTipo,
        ids.licenses.proximo,
      ])
      expect(await kinds({ rav60Category: 'controlador_transito_aereo' })).toEqual([])
      expect(await kinds({ from: day(-5), to: day(5) })).toEqual([ids.licenses.bloqueado, ids.habTipo, ids.certNear])
    })

    it('accepts several statuses, comma-separated or as repeated params', async () => {
      const kinds = async (query: string) =>
        (
          (await http().get(`/api/reports/vencimientos?q=${RUN}&${query}`).set(as(users.admin)).expect(200)).body
            .items as ExpiryReportRow[]
        ).map((r) => r.credentialId)
      expect(await kinds('status=bloqueada,proxima_a_vencer')).toEqual([
        ids.licenses.bloqueado,
        ids.certNear,
        ids.licenses.proximo,
      ])
      expect(await kinds('status=bloqueada&status=vencida&rav60Category=piloto_comercial')).toEqual([
        ids.licenses.vencido,
        ids.licenses.bloqueado,
        ids.habTipo,
      ])
      await http().get(`/api/reports/vencimientos?status=vencida,activa`).set(as(users.admin)).expect(400)
    })

    it('paginates', async () => {
      const { body } = await report(users.admin, 'vencimientos', { page: '2', pageSize: '2' }).expect(200)
      expect(body).toMatchObject({ page: 2, pageSize: 2, total: 5 })
      expect(body.items.map((r: ExpiryReportRow) => r.credentialId)).toEqual([ids.habTipo, ids.certNear])
    })
  })

  describe('report 2: consolidated status per person', () => {
    it('gives every person their current credentials and their worst status', async () => {
      const { body } = await report(users.supLic, 'estado_consolidado').expect(200)
      const rows = body.items as ConsolidatedReportRow[]
      expect(rows.map((r) => [r.personalId, r.status])).toEqual([
        [people.vencido.id, 'vencida'],
        [people.proximo.id, 'vencida'],
        [people.vigente.id, 'vigente'],
        [people.bloqueado.id, 'bloqueada'],
        [people.sinCredenciales.id, 'sin_credenciales'],
        [people.permanente.id, 'vigente'],
      ])
      expect(rows[0]).toMatchObject({
        licenses: [{ licenseTypeName: `${RUN} Piloto Comercial`, expiryDate: day(-10), status: 'vencida' }],
        medical: { rav67Class: 'clase_1', expiryDate: day(5), status: 'proxima_a_vencer' },
        activeBlocks: 0,
        nextExpiryDate: day(-10),
      })
      expect(rows[1]).toMatchObject({ ratings: { total: 2, expired: 1, nearExpiry: 0 }, nextExpiryDate: day(-1) })
      expect(rows[3]).toMatchObject({ activeBlocks: 1 })
      expect(rows[4]).toMatchObject({ licenses: [], medical: null, nextExpiryDate: null })
      expect(rows[5]).toMatchObject({ licenses: [{ expiryDate: null, status: 'vigente' }], nextExpiryDate: null })
    })

    it('filters by consolidated status, license type, category and next expiry', async () => {
      const persons = async (query: Record<string, string>) =>
        (
          (await report(users.admin, 'estado_consolidado', query).expect(200)).body.items as ConsolidatedReportRow[]
        ).map((r) => r.personalId)
      expect(await persons({ status: 'sin_credenciales' })).toEqual([people.sinCredenciales.id])
      expect(await persons({ licenseTypeId: ids.types.controlador })).toEqual([people.vigente.id])
      expect(await persons({ rav60Category: 'tecnico_mantenimiento' })).toEqual([people.permanente.id])
      expect(await persons({ from: day(-5), to: day(0) })).toEqual([people.proximo.id, people.bloqueado.id])
    })

    it('accepts several statuses, license types and categories, comma-separated or as repeated params', async () => {
      const persons = async (query: string) =>
        (
          (await http().get(`/api/reports/estado_consolidado?q=${RUN}&${query}`).set(as(users.admin)).expect(200)).body
            .items as ConsolidatedReportRow[]
        ).map((r) => r.personalId)
      expect(await persons('status=sin_credenciales,bloqueada')).toEqual([
        people.bloqueado.id,
        people.sinCredenciales.id,
      ])
      expect(await persons(`licenseTypeId=${ids.types.controlador}&licenseTypeId=${ids.types.permanente}`)).toEqual([
        people.vigente.id,
        people.permanente.id,
      ])
      expect(await persons('rav60Category=tecnico_mantenimiento,controlador_transito_aereo&status=vigente')).toEqual([
        people.vigente.id,
        people.permanente.id,
      ])
      expect(await persons('status=&rav60Category=')).toHaveLength(6)
    })
  })

  describe('report 3: active blocks', () => {
    it('lists only unresolved blocks, with who registered them', async () => {
      const { body } = await report(users.supMed, 'bloqueos_activos').expect(200)
      const rows = body.items as ActiveBlockReportRow[]
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        blockId: ids.blockActive,
        personalId: people.bloqueado.id,
        cedula: people.bloqueado.cedula,
        type: 'medico',
        reason: '=Impedimento ficticio',
        createdByName: 'Test admin',
      })
      expect(
        (await report(users.admin, 'bloqueos_activos', { licenseTypeId: ids.types.controlador }).expect(200)).body
          .total,
      ).toBe(0)
      expect((await report(users.admin, 'bloqueos_activos', { to: day(-1) }).expect(200)).body.total).toBe(0)
      expect((await report(users.admin, 'bloqueos_activos', { from: day(0) }).expect(200)).body.total).toBe(1)
    })
  })

  describe('access (D10)', () => {
    it('lets Consulta read report 1 only, and export nothing', async () => {
      await report(users.consulta, 'vencimientos').expect(200)
      await report(users.consulta, 'estado_consolidado').expect(403)
      await report(users.consulta, 'bloqueos_activos').expect(403)
      await http()
        .get('/api/reports/vencimientos/export')
        .query({ format: 'csv', q: RUN })
        .set(as(users.consulta))
        .expect(403)
      expect(await exportsBy(users.consulta.id)).toHaveLength(0)
    })

    it('does not audit reads', async () => {
      await report(users.supLic, 'vencimientos').expect(200)
      expect(await exportsBy(users.supLic.id)).toHaveLength(0)
    })
  })

  describe('export', () => {
    it('exports the filtered rows to CSV and audits the export', async () => {
      const before = (await exportsBy(users.supMed.id)).length
      const res = await http()
        .get('/api/reports/bloqueos_activos/export')
        .query({ format: 'csv', q: RUN })
        .set(as(users.supMed))
        .expect(200)
      expect(res.headers['content-type']).toMatch(/^text\/csv; charset=utf-8/)
      expect(res.text.charCodeAt(0)).toBe(0xfeff)
      expect(res.headers['content-disposition']).toMatch(/^attachment; filename="bloqueos_activos-\d{8}\.csv"$/)
      const lines = res.text.replace(String.fromCharCode(0xfeff), '').trimEnd().split('\r\n')
      expect(lines[0]).toBe('Cédula,Nombre,Tipo,Motivo,Registrado,Registrado por')
      expect(lines).toHaveLength(2)
      // A cell that starts like a formula is neutralized for spreadsheets.
      expect(lines[1]).toContain(
        `${people.bloqueado.cedula},Prueba ${LAST_NAMES.bloqueado},Médico,'=Impedimento ficticio,`,
      )

      const audits = await exportsBy(users.supMed.id)
      expect(audits).toHaveLength(before + 1)
      expect(audits.at(-1)).toMatchObject({
        entity: 'reporte',
        entityId: null,
        changes: { after: { report: 'bloqueos_activos', format: 'csv', rows: 1, filters: { q: RUN } } },
      })
    })

    it('exports to PDF and audits the export', async () => {
      const before = (await exportsBy(users.admin.id)).length
      const res = await http()
        .get('/api/reports/estado_consolidado/export')
        .query({ format: 'pdf', q: RUN })
        .set(as(users.admin))
        .buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = []
          response.on('data', (chunk: Buffer) => chunks.push(chunk))
          response.on('end', () => callback(null, Buffer.concat(chunks)))
        })
        .expect(200)
      expect(res.headers['content-type']).toBe('application/pdf')
      expect(res.headers['content-disposition']).toMatch(/^attachment; filename="estado_consolidado-\d{8}\.pdf"$/)
      const body = res.body as Buffer
      expect(body.subarray(0, 5).toString()).toBe('%PDF-')
      const audits = await exportsBy(users.admin.id)
      expect(audits).toHaveLength(before + 1)
      expect(audits.at(-1)).toMatchObject({
        changes: { after: { report: 'estado_consolidado', format: 'pdf', rows: 6 } },
      })
    })

    it('exports with several values per filter and audits them as lists', async () => {
      const before = (await exportsBy(users.admin.id)).length
      const res = await http()
        .get(`/api/reports/estado_consolidado/export?format=csv&q=${RUN}&status=bloqueada,sin_credenciales`)
        .set(as(users.admin))
        .expect(200)
      expect(res.text.trimEnd().split('\r\n')).toHaveLength(3)
      const audits = await exportsBy(users.admin.id)
      expect(audits).toHaveLength(before + 1)
      expect(audits.at(-1)).toMatchObject({
        changes: { after: { rows: 2, filters: { q: RUN, status: ['bloqueada', 'sin_credenciales'] } } },
      })
    })
  })
})
