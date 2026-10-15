import { randomInt, randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import {
  bloqueo,
  catalogLicenseType,
  certificadoMedico,
  createDb,
  licencia,
  personalAeronautico,
  usuario,
} from '@sryg/db'
import { publicVerificationSchema } from '@sryg/types'
import { eq, inArray } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../test/create-test-app'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)
const RUN = randomUUID().slice(0, 8)
const TODAY = new Date().toISOString().slice(0, 10)

function daysFromToday(days: number): string {
  const date = new Date(`${TODAY}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

describe('public verification (W2-2, OUT-04, D9)', () => {
  let app: INestApplication
  let actorId: string
  let licenseTypeId: string
  const personIds: string[] = []
  const tokens = {} as Record<'license' | 'nearExpiry' | 'permanent' | 'expired' | 'certificate' | 'blocked', string>
  const http = () => request(app.getHttpServer())
  const verify = (token: string) => http().get(`/api/public/verify/${token}`)

  beforeAll(async () => {
    app = await createTestApp()
    const [actor] = await db
      .insert(usuario)
      .values({
        email: `verify-${RUN}@sryg.test`,
        fullName: 'Test verify',
        passwordHash: 'x',
        role: 'administrador',
        area: 'ambas',
      })
      .returning()
    actorId = actor!.id
    const person = async () => {
      const [row] = await db
        .insert(personalAeronautico)
        .values({
          cedula: String(randomInt(10_000_000, 99_999_999)),
          firstNames: `Verif${RUN}`,
          lastNames: 'Ficticia',
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning()
      personIds.push(row!.id)
      return row!.id
    }
    const [type] = await db
      .insert(catalogLicenseType)
      .values({ nameEs: `${RUN} Piloto Privado - Avión`, rav60Category: 'piloto_privado' })
      .returning()
    licenseTypeId = type!.id
    const license = async (personalId: string, expiryDate: string | null, number = `L-${RUN}`) => {
      const [row] = await db
        .insert(licencia)
        .values({ personalId, licenseTypeId, number, issueDate: daysFromToday(-800), expiryDate })
        .returning()
      return row!.verificationToken
    }
    const holder = await person()
    tokens.license = await license(holder, daysFromToday(400), `L-${RUN}-1`)
    tokens.nearExpiry = await license(holder, daysFromToday(2))
    tokens.permanent = await license(holder, null)
    tokens.expired = await license(holder, daysFromToday(-1))
    const [cert] = await db
      .insert(certificadoMedico)
      .values({
        personalId: holder,
        rav67Class: 'clase_2',
        number: `C-${RUN}`,
        issueDate: daysFromToday(-10),
        expiryDate: daysFromToday(355),
        restrictions: 'Dato que no debe salir',
      })
      .returning()
    tokens.certificate = cert!.verificationToken
    const blocked = await person()
    tokens.blocked = await license(blocked, daysFromToday(400))
    await db.insert(bloqueo).values({ personalId: blocked, type: 'medico', reason: 'Ficticio', createdBy: actorId })
  })

  afterAll(async () => {
    await app.close()
    await db.delete(licencia).where(inArray(licencia.personalId, personIds))
    await db.delete(certificadoMedico).where(inArray(certificadoMedico.personalId, personIds))
    await db.delete(bloqueo).where(inArray(bloqueo.personalId, personIds))
    await db.delete(personalAeronautico).where(inArray(personalAeronautico.id, personIds))
    await db.delete(catalogLicenseType).where(eq(catalogLicenseType.id, licenseTypeId))
    await db.delete(usuario).where(eq(usuario.id, actorId))
    await pool.end()
  })

  it('answers without authentication and with only the kind, number, status and expiry', async () => {
    const res = await verify(tokens.license).expect(200)
    expect(res.body).toEqual({
      kind: 'licencia',
      number: `L-${RUN}-1`,
      status: 'vigente',
      expiryDate: daysFromToday(400),
    })
    expect(Object.keys(res.body).sort()).toEqual(['expiryDate', 'kind', 'number', 'status'])
    expect(publicVerificationSchema.parse(res.body)).toEqual(res.body)
  })

  it('verifies a medical certificate without exposing its restrictions', async () => {
    const res = await verify(tokens.certificate).expect(200)
    expect(res.body).toEqual({
      kind: 'certificado_medico',
      number: `C-${RUN}`,
      status: 'vigente',
      expiryDate: daysFromToday(355),
    })
    expect(JSON.stringify(res.body)).not.toContain('Dato que no debe salir')
  })

  it('reports a credential near expiry or without expiry as vigente, an expired one as vencida', async () => {
    expect((await verify(tokens.nearExpiry).expect(200)).body.status).toBe('vigente')
    expect((await verify(tokens.permanent).expect(200)).body).toMatchObject({ status: 'vigente', expiryDate: null })
    expect((await verify(tokens.expired).expect(200)).body.status).toBe('vencida')
  })

  it('reports bloqueada while the holder has an active block (D17)', async () => {
    expect((await verify(tokens.blocked).expect(200)).body.status).toBe('bloqueada')
  })

  it('answers 404 for an unknown or malformed token', async () => {
    await verify(randomUUID()).expect(404)
    await verify('no-es-un-token').expect(404)
  })
})

describe('public verification throttle', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp({ LOGIN_THROTTLE_LIMIT: '2' })
  })
  afterAll(async () => {
    await app.close()
  })

  it('answers 429 once a client exceeds the limit', async () => {
    const token = randomUUID()
    await request(app.getHttpServer()).get(`/api/public/verify/${token}`).expect(404)
    await request(app.getHttpServer()).get(`/api/public/verify/${token}`).expect(404)
    const res = await request(app.getHttpServer()).get(`/api/public/verify/${token}`).expect(429)
    expect(res.headers['retry-after']).toBeDefined()
  })
})
