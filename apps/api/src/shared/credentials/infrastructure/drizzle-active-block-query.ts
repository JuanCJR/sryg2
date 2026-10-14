import { bloqueo, type DbExecutor } from '@sryg/db'
import { and, eq, inArray } from 'drizzle-orm'
import type { ActiveBlockQuery } from '../domain/active-block-query'

export class DrizzleActiveBlockQuery implements ActiveBlockQuery {
  constructor(private readonly executor: DbExecutor) {}

  async hasActiveBlock(personalId: string): Promise<boolean> {
    return (await this.withActiveBlock([personalId])).has(personalId)
  }

  async withActiveBlock(personalIds: readonly string[]): Promise<Set<string>> {
    if (personalIds.length === 0) return new Set()
    const rows = await this.executor
      .select({ personalId: bloqueo.personalId })
      .from(bloqueo)
      .where(and(eq(bloqueo.status, 'activo'), inArray(bloqueo.personalId, [...personalIds])))
    return new Set(rows.map((r) => r.personalId))
  }
}
