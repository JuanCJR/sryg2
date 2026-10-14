import { randomUUID } from 'node:crypto'
import { Client } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runMigrations } from './migrate'
import { TEST_DATABASE_URL } from './test/test-db'

// A fresh database, so the data loaded by the migrations is checked before any test truncates it.
const name = `sryg_migrations_${randomUUID().slice(0, 8)}`
const adminUrl = new URL(TEST_DATABASE_URL)
adminUrl.pathname = '/postgres'
const targetUrl = new URL(TEST_DATABASE_URL)
targetUrl.pathname = `/${name}`

async function admin(query: string) {
  const client = new Client({ connectionString: adminUrl.toString() })
  await client.connect()
  try {
    await client.query(query)
  } finally {
    await client.end()
  }
}

describe('migrations', () => {
  beforeAll(async () => {
    await admin(`CREATE DATABASE "${name}"`)
    await runMigrations(targetUrl.toString())
  })
  afterAll(() => admin(`DROP DATABASE IF EXISTS "${name}"`))

  it('load the D3 placeholders in parametro_sistema', async () => {
    const client = new Client({ connectionString: targetUrl.toString() })
    await client.connect()
    try {
      const { rows } = await client.query<{ key: string; value: number; is_placeholder: boolean }>(
        'SELECT key, value, is_placeholder FROM parametro_sistema ORDER BY key',
      )
      expect(rows).toEqual([
        { key: 'alerts.threshold_days', value: 30, is_placeholder: true },
        { key: 'medical.validity_months.clase_1', value: 12, is_placeholder: true },
        { key: 'medical.validity_months.clase_2', value: 12, is_placeholder: true },
        { key: 'medical.validity_months.clase_3', value: 12, is_placeholder: true },
      ])
    } finally {
      await client.end()
    }
  })
})
