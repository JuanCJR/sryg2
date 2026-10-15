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
  catalogMedicalObservation,
  catalogNationality,
  catalogTypeRating,
  certificadoMedico,
  certificadoObservacion,
  createDb,
  habilitacionClase,
  habilitacionClaseAeronave,
  habilitacionTipo,
  licencia,
  licenciaObservacion,
  personalAeronautico,
} from '@sryg/db'
import { and, eq, inArray } from 'drizzle-orm'
import { PDFParse } from 'pdf-parse'
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

/** A binary response body as a Buffer (supertest leaves unknown types unparsed). */
const binary = (req: request.Test) =>
  req.buffer(true).parse((res, done) => {
    const chunks: Buffer[] = []
    res.on('data', (chunk: Buffer) => chunks.push(chunk))
    res.on('end', () => done(null, Buffer.concat(chunks)))
  })

async function pdfText(pdf: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(pdf) })
  try {
    // Wrapped lines become spaces, so assertions do not depend on where the card breaks a line.
    return (await parser.getText()).text.replace(/\s+/g, ' ')
  } finally {
    await parser.destroy()
  }
}

type PersonKey = 'holder' | 'blocked' | 'expired' | 'other'

describe('credential PDFs http (W2-2, OUT-01..05)', () => {
  let app: INestApplication
  let users: Record<'admin' | 'supLic' | 'supMed' | 'consulta', TestUser>
  const people = {} as Record<PersonKey, { id: string; cedula: string }>
  const ids = {} as {
    license: string
    nearExpiryLicense: string
    permanentLicense: string
    certificate: string
    blockedLicense: string
    blockedCertificate: string
    expiredLicense: string
    expiredCertificate: string
    otherLicense: string
    licenseType: string
    permanentType: string
  }
  const http = () => request(app.getHttpServer())
  const as = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` })
  const licensePdf = (personalId: string, id: string) => `/api/personnel/${personalId}/credentials/license/${id}.pdf`
  const medicalPdf = (personalId: string, id: string) => `/api/personnel/${personalId}/credentials/medical/${id}.pdf`
  const download = (path: string, user: TestUser) => binary(http().get(path).set(as(user)))
  const issueRows = (entityId: string) =>
    db
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.entityId, entityId), eq(auditoria.action, 'emitir')))

  beforeAll(async () => {
    app = await createTestApp()
    users = await createTestUsers(db, app, {
      admin: { role: 'administrador', area: 'ambas' },
      supLic: { role: 'supervisor', area: 'licencias' },
      supMed: { role: 'supervisor', area: 'medicina' },
      consulta: { role: 'consulta', area: 'ambas' },
    })
    const [nationality] = await db
      .insert(catalogNationality)
      .values({ nameEs: `${RUN} Venezolana`, nameEn: 'Venezuelan' })
      .returning()
    for (const key of ['holder', 'blocked', 'expired', 'other'] as const) {
      const cedula = String(randomInt(10_000_000, 99_999_999))
      const [row] = await db
        .insert(personalAeronautico)
        .values({
          cedula,
          firstNames: `Cred${RUN}`,
          lastNames: `Ficticia ${key}`,
          nationalityId: nationality!.id,
          birthDate: '1990-01-31',
          address: 'Calle Ficticia 1, Maracay',
          bloodType: 'o_pos',
          createdBy: users.admin.id,
          updatedBy: users.admin.id,
        })
        .returning()
      people[key] = { id: row!.id, cedula }
    }
    const [licenseType, permanentType] = await db
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
        { nameEs: `${RUN} Técnico de Mantenimiento`, rav60Category: 'tecnico_mantenimiento', appliesExpiry: false },
      ])
      .returning()
    ids.licenseType = licenseType!.id
    ids.permanentType = permanentType!.id
    const [typeRating] = await db
      .insert(catalogTypeRating)
      .values({ nameEs: `${RUN} B737` })
      .returning()
    const [fn] = await db
      .insert(catalogFunction)
      .values({ nameEs: `${RUN} Capitán`, nameEn: 'PIC' })
      .returning()
    const [classRating] = await db
      .insert(catalogClassRating)
      .values({ nameEs: `${RUN} Monomotores Terrestres`, nameEn: 'Single Engine Land' })
      .returning()
    const [aircraft] = await db
      .insert(catalogAircraft)
      .values({ nameEs: `${RUN} C172` })
      .returning()
    const [licenseObs] = await db
      .insert(catalogLicenseObservation)
      .values({ nameEs: `${RUN} Debe usar lentes correctores` })
      .returning()
    const [medicalObs] = await db
      .insert(catalogMedicalObservation)
      .values({ nameEs: `${RUN} No apto para vuelo nocturno` })
      .returning()

    const insertLicense = async (personalId: string, values: Partial<typeof licencia.$inferInsert> = {}) => {
      const [row] = await db
        .insert(licencia)
        .values({
          personalId,
          licenseTypeId: licenseType!.id,
          number: `L-${RUN}-${randomInt(1000, 9999)}`,
          issueDate: daysFromToday(-30),
          expiryDate: daysFromToday(700),
          ...values,
        })
        .returning()
      return row!.id
    }
    const insertCertificate = async (
      personalId: string,
      values: Partial<typeof certificadoMedico.$inferInsert> = {},
    ) => {
      const [row] = await db
        .insert(certificadoMedico)
        .values({
          personalId,
          rav67Class: 'clase_1',
          number: `C-${RUN}-${randomInt(1000, 9999)}`,
          issueDate: daysFromToday(-30),
          expiryDate: daysFromToday(300),
          restrictions: 'Solo vuelo diurno',
          ...values,
        })
        .returning()
      return row!.id
    }

    ids.license = await insertLicense(people.holder.id)
    ids.nearExpiryLicense = await insertLicense(people.holder.id, { expiryDate: daysFromToday(3) })
    ids.permanentLicense = await insertLicense(people.holder.id, { licenseTypeId: permanentType!.id, expiryDate: null })
    ids.certificate = await insertCertificate(people.holder.id)
    ids.blockedLicense = await insertLicense(people.blocked.id)
    ids.blockedCertificate = await insertCertificate(people.blocked.id)
    ids.expiredLicense = await insertLicense(people.expired.id, {
      issueDate: daysFromToday(-800),
      expiryDate: daysFromToday(-1),
    })
    ids.expiredCertificate = await insertCertificate(people.expired.id, {
      issueDate: daysFromToday(-400),
      expiryDate: daysFromToday(-1),
    })
    ids.otherLicense = await insertLicense(people.other.id)

    await db.insert(licenciaObservacion).values({ licenciaId: ids.license, observationId: licenseObs!.id })
    await db.insert(habilitacionTipo).values({
      licenciaId: ids.license,
      typeRatingId: typeRating!.id,
      functionId: fn!.id,
      expiryDate: daysFromToday(200),
    })
    const [classRow] = await db
      .insert(habilitacionClase)
      .values({ licenciaId: ids.license, classRatingId: classRating!.id, expiryDate: daysFromToday(250) })
      .returning()
    await db.insert(habilitacionClaseAeronave).values({ habilitacionClaseId: classRow!.id, aircraftId: aircraft!.id })
    await db
      .insert(certificadoObservacion)
      .values({ certificadoMedicoId: ids.certificate, observationId: medicalObs!.id })
    await db.insert(bloqueo).values({
      personalId: people.blocked.id,
      type: 'administrativo',
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
    await db.delete(catalogLicenseType).where(inArray(catalogLicenseType.id, [ids.licenseType, ids.permanentType]))
    await deleteTestUsers(db, users)
    await pool.end()
  })

  it('prints the license as a PDF with the bilingual catalog texts, and audits it as emitir', async () => {
    const res = await download(licensePdf(people.holder.id, ids.license), users.admin).expect(200)
    expect(res.headers['content-type']).toBe('application/pdf')
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="credencial-licencia-L-.+\.pdf"$/)
    expect(res.headers['cache-control']).toBe('no-store')
    const text = await pdfText(res.body as Buffer)
    expect(text).toContain(`Cred${RUN} Ficticia holder`)
    expect(text).toContain(`${RUN} Piloto Comercial - Avión`)
    expect(text).toContain('Commercial Pilot - Airplane')
    expect(text).toContain(`${RUN} Venezolana / Venezuelan`)
    expect(text).toContain('31/Ene/1990')
    expect(text).toContain(`${RUN} B737 · ${RUN} Capitán / PIC`)
    expect(text).toContain(`${RUN} Monomotores Terrestres / Single Engine Land: ${RUN} C172`)
    expect(text).toContain(`${RUN} Debe usar lentes correctores`)

    const rows = await issueRows(ids.license)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ actorId: users.admin.id, entity: 'licencia', action: 'emitir' })
    expect(rows[0]!.changes).toMatchObject({ after: { salida: 'credencial_pdf' } })
  })

  it('prints the medical certificate with its class, blood type, restrictions and the license types it covers (D8, D13)', async () => {
    const res = await download(medicalPdf(people.holder.id, ids.certificate), users.admin).expect(200)
    expect(res.headers['content-type']).toBe('application/pdf')
    expect(res.headers['content-disposition']).toMatch(
      /^attachment; filename="credencial-certificado-medico-C-.+\.pdf"$/,
    )
    const text = await pdfText(res.body as Buffer)
    expect(text).toContain('PRIMERA CLASE')
    expect(text).toContain('O Rh+')
    expect(text).toContain(`${RUN} No apto para vuelo nocturno; Solo vuelo diurno`)
    expect(text).toContain(`${RUN} Piloto Comercial - Avión / Commercial Pilot - Airplane`)
    expect(text).not.toContain(`${RUN} Técnico de Mantenimiento`)

    const rows = await issueRows(ids.certificate)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ actorId: users.admin.id, entity: 'certificado_medico' })
  })

  it('still prints a license near expiry or without expiry (D20): both are in force', async () => {
    await download(licensePdf(people.holder.id, ids.nearExpiryLicense), users.admin).expect(200)
    await download(licensePdf(people.holder.id, ids.permanentLicense), users.admin).expect(200)
  })

  it('answers 409 while the person has an active block, and audits nothing (D9, BR-07)', async () => {
    const license = await http().get(licensePdf(people.blocked.id, ids.blockedLicense)).set(as(users.admin)).expect(409)
    expect(license.body).toMatchObject({ statusCode: 409, message: expect.stringMatching(/bloqueo activo/) })
    await http().get(medicalPdf(people.blocked.id, ids.blockedCertificate)).set(as(users.admin)).expect(409)
    expect(await issueRows(ids.blockedLicense)).toHaveLength(0)
    expect(await issueRows(ids.blockedCertificate)).toHaveLength(0)
  })

  it('answers 409 when the credential is expired', async () => {
    const license = await http().get(licensePdf(people.expired.id, ids.expiredLicense)).set(as(users.admin)).expect(409)
    expect(license.body.message).toMatch(/no está vigente/)
    await http().get(medicalPdf(people.expired.id, ids.expiredCertificate)).set(as(users.admin)).expect(409)
    expect(await issueRows(ids.expiredLicense)).toHaveLength(0)
  })

  it('answers 404 for a credential of another person or an unknown one, and 400 for a malformed id', async () => {
    await http().get(licensePdf(people.holder.id, ids.otherLicense)).set(as(users.admin)).expect(404)
    await http().get(medicalPdf(people.other.id, ids.certificate)).set(as(users.admin)).expect(404)
    await http().get(licensePdf(people.holder.id, randomUUID())).set(as(users.admin)).expect(404)
    await http().get(licensePdf(people.holder.id, 'no-es-uuid')).set(as(users.admin)).expect(400)
  })

  it('lets only the Admin and the Supervisor of the matching area print (D1, D24)', async () => {
    await http().get(licensePdf(people.holder.id, ids.license)).expect(401)
    await http().get(licensePdf(people.holder.id, ids.license)).set(as(users.consulta)).expect(403)
    await http().get(medicalPdf(people.holder.id, ids.certificate)).set(as(users.consulta)).expect(403)
    await download(licensePdf(people.holder.id, ids.license), users.supLic).expect(200)
    await http().get(medicalPdf(people.holder.id, ids.certificate)).set(as(users.supLic)).expect(403)
    await download(medicalPdf(people.holder.id, ids.certificate), users.supMed).expect(200)
    await http().get(licensePdf(people.holder.id, ids.license)).set(as(users.supMed)).expect(403)
  })
})
