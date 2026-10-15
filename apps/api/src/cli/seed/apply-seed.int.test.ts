import { randomUUID } from 'node:crypto'
import {
  catalogLicenseType,
  catalogTypeRating,
  createDb,
  licencia,
  personalAeronautico,
  runMigrations,
  usuario,
} from '@sryg/db'
import { count } from 'drizzle-orm'
import { Client } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { applySeed, applySeedCatalogs } from './apply-seed'
import { buildSeedCatalogs, buildSeedData } from './build-seed-data'

const BASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
// A throwaway database: the seed must not mix with the data other suites rely on.
const name = `sryg_seed_${randomUUID().slice(0, 8)}`
const adminUrl = Object.assign(new URL(BASE_URL), { pathname: '/postgres' }).toString()
const targetUrl = Object.assign(new URL(BASE_URL), { pathname: `/${name}` }).toString()

async function admin(query: string) {
  const client = new Client({ connectionString: adminUrl })
  await client.connect()
  await client.query(query).finally(() => client.end())
}

describe('applySeed', () => {
  const { db, pool } = createDb(targetUrl)
  const data = buildSeedData({ seed: 2026, today: '2026-10-14' })
  const hasher = { hash: (plain: string) => Promise.resolve(`hash:${plain}`) }
  const counts = async () => ({
    users: (await db.select({ n: count() }).from(usuario))[0]!.n,
    personnel: (await db.select({ n: count() }).from(personalAeronautico))[0]!.n,
    licenses: (await db.select({ n: count() }).from(licencia))[0]!.n,
  })

  beforeAll(async () => {
    await admin(`CREATE DATABASE "${name}"`)
    await runMigrations(targetUrl)
  })
  afterAll(async () => {
    await pool.end()
    await admin(`DROP DATABASE IF EXISTS "${name}"`)
  })

  it('loads only the catalogs for production, idempotently', async () => {
    const catalogs = buildSeedCatalogs()
    await applySeedCatalogs(db, catalogs)
    await applySeedCatalogs(db, catalogs)
    expect(await counts()).toEqual({ users: 0, personnel: 0, licenses: 0 })
    expect((await db.select({ n: count() }).from(catalogLicenseType))[0]!.n).toBe(catalogs.licenseTypes.length)
    expect((await db.select({ n: count() }).from(catalogTypeRating))[0]!.n).toBe(catalogs.typeRatings.length)
  })

  it('loads the whole data set and is idempotent', async () => {
    await applySeed(db, data, { password: 'sryg-dev-password', hasher })
    const first = await counts()
    expect(first).toEqual({ users: 9, personnel: 50, licenses: data.licenses.length })
    await applySeed(db, data, { password: 'sryg-dev-password', hasher })
    expect(await counts()).toEqual(first)
    const [user] = await db.select().from(usuario).limit(1)
    expect(user!.passwordHash).toBe('hash:sryg-dev-password')
  })
})
