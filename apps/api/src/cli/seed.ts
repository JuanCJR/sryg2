import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createDb } from '@sryg/db'
import { PASSWORD_MIN_LENGTH } from '@sryg/types'
import { Argon2PasswordHasher } from '../auth/infrastructure/argon2-password-hasher'
import { applySeed } from './seed/apply-seed'
import { buildSeedData } from './seed/build-seed-data'

const DEFAULT_RANDOM_SEED = 2026
// Development only, and printed on purpose: every seeded user shares it.
const DEFAULT_PASSWORD = 'sryg-demo-2026'

/**
 * Loads the fictitious development data set (D3, D25): catalogs, ~50 people with credentials and
 * blocks, and one user per role and area. Deterministic for SEED_RANDOM (default 2026) and
 * SEED_TODAY (default: today, UTC); safe to re-run. Refuses to run with NODE_ENV=production.
 */
async function main() {
  for (const file of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
    if (existsSync(file)) process.loadEnvFile(file)
  }
  if (process.env.NODE_ENV === 'production') throw new Error('The development seed never runs in production.')
  const databaseUrl = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_MIGRATION_URL (or DATABASE_URL) is required.')
  const seed = Number(process.env.SEED_RANDOM || DEFAULT_RANDOM_SEED)
  const today = process.env.SEED_TODAY || new Date().toISOString().slice(0, 10)
  const password = process.env.SEED_USERS_PASSWORD || DEFAULT_PASSWORD
  if (!Number.isInteger(seed)) throw new Error('SEED_RANDOM must be an integer.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error('SEED_TODAY must be YYYY-MM-DD.')
  if (password.length < PASSWORD_MIN_LENGTH)
    throw new Error(`SEED_USERS_PASSWORD needs ${PASSWORD_MIN_LENGTH} characters.`)

  const data = buildSeedData({ seed, today })
  const { db, pool } = createDb(databaseUrl)
  try {
    await applySeed(db, data, { password, hasher: new Argon2PasswordHasher() })
  } finally {
    await pool.end()
  }
  console.log(`Seed ${seed} applied for ${today}: ${data.personnel.length} people, ${data.licenses.length} licenses.`)
  console.log(`Users (password ${process.env.SEED_USERS_PASSWORD ? 'from SEED_USERS_PASSWORD' : DEFAULT_PASSWORD}):`)
  for (const user of data.users) console.log(`  ${user.email}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
