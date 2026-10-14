import { Client } from 'pg'
import { runMigrations } from '../migrate'
import { TEST_DATABASE_URL } from './test-db'

/** Creates the test database when missing (local runs) and applies all migrations. */
export default async function setup() {
  const target = new URL(TEST_DATABASE_URL)
  const dbName = decodeURIComponent(target.pathname.slice(1))
  const admin = new URL(TEST_DATABASE_URL)
  admin.pathname = '/postgres'
  const client = new Client({ connectionString: admin.toString() })
  await client.connect()
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])
    if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${dbName.replaceAll('"', '""')}"`)
  } finally {
    await client.end()
  }
  await runMigrations(TEST_DATABASE_URL)
}
