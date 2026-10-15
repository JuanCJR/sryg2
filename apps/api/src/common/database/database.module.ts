import { Global, Inject, Logger, Module, type OnApplicationShutdown } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createDb, type Db } from '@sryg/db'
import type { Pool } from 'pg'
import type { Env } from '../config/env.schema'

export const DB = Symbol('DB')
const POOL = Symbol('DB_POOL')

@Global()
@Module({
  providers: [
    {
      provide: POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const created = createDb(config.get('DATABASE_URL', { infer: true }))
        // Idle clients error when the server drops them (restart, Neon scale-to-zero);
        // without a listener Node treats that as fatal and kills the process.
        created.pool.on('error', (error) => new Logger('Database').warn(`Idle client error: ${error.message}`))
        return created
      },
    },
    { provide: DB, inject: [POOL], useFactory: (created: { db: Db }) => created.db },
  ],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(POOL) private readonly created: { pool: Pool }) {}

  async onApplicationShutdown() {
    await this.created.pool.end()
  }
}
