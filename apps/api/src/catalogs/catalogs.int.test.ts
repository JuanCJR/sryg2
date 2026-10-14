import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { catalogLicenseType, catalogNationality, catalogTypeRating, createDb } from '@sryg/db'
import { CATALOGS } from '@sryg/types'
import { like } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../test/create-test-app'
import { createTestUsers, deleteTestUsers, type TestUser } from '../test/test-users'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)
// Run-unique marker so the assertions ignore whatever else the database holds.
const RUN = `zz${randomUUID().slice(0, 8)}`

describe('GET /api/catalogs/:catalog/options (D19)', () => {
  let app: INestApplication
  let users: Record<'consulta', TestUser>
  const options = (catalog: string, query: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .get(`/api/catalogs/${catalog}/options`)
      .query(query)
      .set('Authorization', `Bearer ${users.consulta.token}`)

  beforeAll(async () => {
    await db.insert(catalogNationality).values([
      { nameEs: `${RUN} Venezolana`, nameEn: `${RUN} Venezuelan` },
      { nameEs: `${RUN} Colombiana`, nameEn: `${RUN} Colombian` },
      { nameEs: `${RUN} Antigua`, nameEn: null, active: false },
    ])
    await db.insert(catalogTypeRating).values([{ nameEs: `${RUN} B737` }, { nameEs: `${RUN} A320` }])
    await db
      .insert(catalogLicenseType)
      .values({ nameEs: `${RUN} Piloto Privado - Avión`, nameEn: 'Private Pilot', rav60Category: 'piloto_privado' })
    app = await createTestApp()
    users = await createTestUsers(db, app, { consulta: { role: 'consulta', area: 'ambas' } })
  })
  afterAll(async () => {
    await app.close()
    await db.delete(catalogNationality).where(like(catalogNationality.nameEs, `${RUN}%`))
    await db.delete(catalogTypeRating).where(like(catalogTypeRating.nameEs, `${RUN}%`))
    await db.delete(catalogLicenseType).where(like(catalogLicenseType.nameEs, `${RUN}%`))
    await deleteTestUsers(db, users)
    await pool.end()
  })

  it('returns only active items, sorted by Spanish name, with id, nameEs and nameEn', async () => {
    const res = await options('nationalities', { q: RUN }).expect(200)
    expect(res.body).toEqual([
      { id: expect.any(String), nameEs: `${RUN} Colombiana`, nameEn: `${RUN} Colombian` },
      { id: expect.any(String), nameEs: `${RUN} Venezolana`, nameEn: `${RUN} Venezuelan` },
    ])
  })

  it('searches the English name too, case-insensitively, and honours the limit', async () => {
    expect((await options('nationalities', { q: `${RUN} VENEZUELAN` }).expect(200)).body).toHaveLength(1)
    expect((await options('type-ratings', { q: RUN, limit: '1' }).expect(200)).body).toEqual([
      { id: expect.any(String), nameEs: `${RUN} A320`, nameEn: null },
    ])
  })

  it('answers every D19 catalog', async () => {
    for (const catalog of CATALOGS) await options(catalog, { q: RUN }).expect(200)
    expect((await options('license-types', { q: RUN }).expect(200)).body).toHaveLength(1)
  })

  it('answers 404 for an unknown catalog, 400 for a bad limit and 401 without a token', async () => {
    await options('usuarios').expect(404)
    await options('aircraft', { limit: '500' }).expect(400)
    await request(app.getHttpServer()).get('/api/catalogs/aircraft/options').expect(401)
  })
})
