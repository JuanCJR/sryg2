import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import type { Db } from '@sryg/db'
import { DB } from '../common/database/database.module'
import { Public } from '../common/decorators/public.decorator'

@Public()
@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Liveness: never touches the DB so platform probes do not keep a scale-to-zero database awake. */
  @Get()
  live() {
    return { status: 'ok' }
  }

  /** Readiness: verifies DB connectivity. */
  @Get('ready')
  async ready() {
    try {
      await this.db.execute(sql`select 1`)
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' })
    }
    return { status: 'ok', db: 'up' }
  }
}
