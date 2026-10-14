import type { SettingKey } from '@sryg/types'

export const PARAMETER_ENTITY = 'parametro_sistema'

/** The user performing a mutation; access was already checked by the permission guard (Admin only). */
export interface Actor {
  id: string
}

/** One row of `parametro_sistema` (D3): a number shown as `PENDIENTE INAC` while `isPlaceholder`. */
export interface SystemParameter {
  key: SettingKey
  value: number
  isPlaceholder: boolean
  updatedAt: Date
}

export interface SystemParameterRepository {
  /** Throws when a key is missing: the migration loads every key of `SETTING_KEYS`. */
  findMany(keys: readonly SettingKey[]): Promise<SystemParameter[]>
  /** Stores the value as a real one: `isPlaceholder` becomes false (D3). */
  save(key: SettingKey, value: number, actorId: string): Promise<void>
}
