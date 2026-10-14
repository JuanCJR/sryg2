import path from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { resolvePoolConfig } from './client'

const MIGRATIONS_FOLDER = path.resolve(__dirname, '../migrations')

/** Applies pending migrations from packages/db/migrations using a direct (unpooled) URL. */
export async function runMigrations(url: string): Promise<void> {
  const pool = new Pool(resolvePoolConfig(url))
  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER })
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  const url = process.env.DATABASE_MIGRATION_URL
  if (!url) {
    console.error('DATABASE_MIGRATION_URL is required (use the direct, unpooled connection string).')
    process.exit(1)
  }
  runMigrations(url).then(
    () => console.log('Migrations applied.'),
    (error: unknown) => {
      console.error('Migration failed:', error)
      process.exit(1)
    },
  )
}
