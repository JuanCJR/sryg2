import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createDb } from '@sryg/db'
import { applySeedCatalogs } from './seed/apply-seed'
import { buildSeedCatalogs } from './seed/build-seed-data'

/**
 * Production seed: loads the system settings and the reference catalogs transcribed from SLYM
 * (docs/slym-catalogos/), without people or users. Run from the operator machine with the direct
 * database URL. Safe to run repeatedly: existing items, including ones edited by an administrator,
 * are kept as they are.
 */
async function main() {
  for (const file of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
    if (existsSync(file)) process.loadEnvFile(file)
  }
  const databaseUrl = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_MIGRATION_URL (or DATABASE_URL) is required.')

  const catalogs = buildSeedCatalogs()
  const { db, pool } = createDb(databaseUrl)
  try {
    await applySeedCatalogs(db, catalogs)
  } finally {
    await pool.end()
  }
  console.log('Catalogs applied:')
  for (const [name, items] of Object.entries(catalogs)) console.log(`  ${name}: ${items.length}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
