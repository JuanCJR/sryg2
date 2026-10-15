import { accesoUsuario, type DbExecutor } from '@sryg/db'
import { and, desc, eq } from 'drizzle-orm'
import type { AccessAttempt, AccessLogRecord } from '../dtos/access-log.dto'

/** Reads a user's own attempts back for /panel and /perfil (D23). */
export class AccessLogRepository {
  constructor(private readonly executor: DbExecutor) {}

  async record(attempt: AccessAttempt): Promise<void> {
    await this.executor.insert(accesoUsuario).values(attempt)
  }

  /** The latest `limit` attempts of the user with the given outcome, newest first. */
  latest(usuarioId: string, success: boolean, limit: number): Promise<AccessLogRecord[]> {
    return (
      this.executor
        .select({ at: accesoUsuario.createdAt, ip: accesoUsuario.ip })
        .from(accesoUsuario)
        .where(and(eq(accesoUsuario.usuarioId, usuarioId), eq(accesoUsuario.success, success)))
        // The id breaks ties between attempts recorded within the same clock tick.
        .orderBy(desc(accesoUsuario.createdAt), desc(accesoUsuario.id))
        .limit(limit)
    )
  }
}
