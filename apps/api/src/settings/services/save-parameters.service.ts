import type { SettingKey } from '@sryg/types'
import type { SettingsTransaction } from '../settings.types'
import { type Actor, PARAMETER_ENTITY } from './system-parameter'

type Snapshot = { value: number; isPlaceholder: boolean }

/**
 * Saves parameter values as real ones (D3: `isPlaceholder` becomes false). The writes and their single
 * audit row share one transaction (BR-11). Saving a placeholder's value as is confirms it, so it is
 * written; re-saving an unchanged real value writes nothing.
 */
export class SaveParametersService {
  constructor(private readonly transaction: SettingsTransaction) {}

  async execute(actor: Actor, values: Partial<Record<SettingKey, number>>): Promise<void> {
    await this.transaction.run(async ({ parameters, audit }) => {
      const keys = Object.keys(values) as SettingKey[]
      const current = new Map((await parameters.findMany(keys)).map((row) => [row.key, row]))
      const before: Record<string, Snapshot> = {}
      const after: Record<string, Snapshot> = {}
      for (const key of keys) {
        const value = values[key]!
        const previous = current.get(key)!
        if (!previous.isPlaceholder && previous.value === value) continue
        await parameters.save(key, value, actor.id)
        before[key] = { value: previous.value, isPlaceholder: previous.isPlaceholder }
        after[key] = { value, isPlaceholder: false }
      }
      if (Object.keys(after).length === 0) return
      // The key is text and `auditoria.entity_id` a uuid: the keys travel in `changes`.
      await audit.record({
        actorId: actor.id,
        action: 'actualizar',
        entity: PARAMETER_ENTITY,
        entityId: null,
        changes: { before, after },
      })
    })
  }
}
