import { accesoUsuario, type DbExecutor } from '@sryg/db'
import type { AccessAttempt, AccessLog } from '../domain/access-log'

export class DrizzleAccessLog implements AccessLog {
  constructor(private readonly executor: DbExecutor) {}

  async record(attempt: AccessAttempt): Promise<void> {
    await this.executor.insert(accesoUsuario).values(attempt)
  }
}
