import { bloqueo, type DbExecutor } from '@sryg/db'
import { and, eq, inArray } from 'drizzle-orm'

/** Whether a person has an unresolved block (BR-07): credentials are not issued while it lasts (D9). */
export class ActiveBlocksRepository {
  constructor(private readonly executor: DbExecutor) {}

  async hasActiveBlock(personalId: string): Promise<boolean> {
    return (await this.withActiveBlock([personalId])).has(personalId)
  }

  /** The subset of `personalIds` with an active block, for lists and reports. */
  async withActiveBlock(personalIds: readonly string[]): Promise<Set<string>> {
    if (personalIds.length === 0) return new Set()
    const rows = await this.executor
      .select({ personalId: bloqueo.personalId })
      .from(bloqueo)
      .where(and(eq(bloqueo.status, 'activo'), inArray(bloqueo.personalId, [...personalIds])))
    return new Set(rows.map((r) => r.personalId))
  }
}
