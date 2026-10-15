import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createDb } from '@sryg/db'
import { UserRepository } from '../auth/repositories/user.repository'
import { Argon2PasswordHasher } from '../auth/services/argon2-password-hasher'
import { MissingSeedVariablesError, readSeedAdminInput, SeedAdminService } from '../auth/services/seed-admin.service'

/**
 * Seeds the initial administrator. Run from the operator machine (also against Neon, using the
 * direct URL): reads SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME and the database URL
 * from the environment, falling back to the root .env. Safe to run repeatedly.
 */
async function main() {
  for (const file of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
    if (existsSync(file)) process.loadEnvFile(file)
  }
  const databaseUrl = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL
  if (!databaseUrl) throw new MissingSeedVariablesError(['DATABASE_MIGRATION_URL (or DATABASE_URL)'])
  const input = readSeedAdminInput(process.env)

  const { db, pool } = createDb(databaseUrl)
  try {
    const outcome = await new SeedAdminService(new UserRepository(db), new Argon2PasswordHasher()).execute(input)
    console.log(outcome === 'created' ? `Admin created: ${input.email}` : `Admin already exists: ${input.email}`)
  } finally {
    await pool.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
