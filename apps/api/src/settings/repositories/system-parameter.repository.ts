import { type DbExecutor, parametroSistema } from '@sryg/db'
import type { SettingKey } from '@sryg/types'
import { eq, inArray } from 'drizzle-orm'
import type { SystemParameter } from '../services/system-parameter'

export class SystemParameterRepository {
  constructor(private readonly executor: DbExecutor) {}

  /** Throws when a key is missing: the migration loads every key of `SETTING_KEYS`. */
  async findMany(keys: readonly SettingKey[]): Promise<SystemParameter[]> {
    if (keys.length === 0) return []
    const rows = await this.executor
      .select({
        key: parametroSistema.key,
        value: parametroSistema.value,
        isPlaceholder: parametroSistema.isPlaceholder,
        updatedAt: parametroSistema.updatedAt,
      })
      .from(parametroSistema)
      .where(inArray(parametroSistema.key, [...keys]))
    for (const key of keys) {
      const row = rows.find((r) => r.key === key)
      if (!row || typeof row.value !== 'number') throw new Error(`Parameter ${key} is not configured`)
    }
    return rows as SystemParameter[]
  }

  /** Stores the value as a real one: `isPlaceholder` becomes false (D3). */
  async save(key: SettingKey, value: number, actorId: string): Promise<void> {
    await this.executor
      .update(parametroSistema)
      .set({ value, isPlaceholder: false, updatedBy: actorId })
      .where(eq(parametroSistema.key, key))
  }
}
