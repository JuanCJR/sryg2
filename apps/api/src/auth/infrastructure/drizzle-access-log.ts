import { accesoUsuario, type DbExecutor } from '@sryg/db'
import { and, desc, eq } from 'drizzle-orm'
import type { AccessAttempt, AccessLog, AccessLogReader, AccessLogRecord } from '../domain/access-log'

export class DrizzleAccessLog implements AccessLog, AccessLogReader {
  constructor(private readonly executor: DbExecutor) {}

  async record(attempt: AccessAttempt): Promise<void> {
    await this.executor.insert(accesoUsuario).values(attempt)
  }

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
