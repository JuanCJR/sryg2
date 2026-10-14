import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool, type PoolConfig } from 'pg'

const SSL_MODES = new Set(['require', 'verify-ca', 'verify-full'])

/**
 * Translates a Postgres URL into pg pool options. `sslmode=require|verify-ca|verify-full`
 * (Neon) enables TLS with certificate verification; the libpq-only params are stripped so
 * that pg does not reinterpret them.
 */
export function resolvePoolConfig(url: string): PoolConfig {
  const parsed = new URL(url)
  const sslmode = parsed.searchParams.get('sslmode')
  parsed.searchParams.delete('sslmode')
  parsed.searchParams.delete('uselibpqcompat')
  const config: PoolConfig = { connectionString: parsed.toString() }
  if (sslmode && SSL_MODES.has(sslmode)) config.ssl = { rejectUnauthorized: true }
  return config
}

export function createDb(url: string) {
  const pool = new Pool(resolvePoolConfig(url))
  return { db: drizzle(pool), pool }
}

export type Db = NodePgDatabase

/** Query surface shared by the pool-backed `Db` and a transaction handle, so adapters work with either. */
export type DbExecutor = Pick<Db, 'select' | 'insert' | 'update' | 'delete'>
