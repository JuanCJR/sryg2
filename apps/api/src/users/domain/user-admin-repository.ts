import type { ListQuery, Paginated } from '@sryg/types'
import type { ManagedUser, ManagedUserChanges, NewManagedUser } from './managed-user'

export interface UserAdminRepository {
  findById(id: string): Promise<ManagedUser | null>
  /** Search by name or email (case-insensitive), ordered by name. */
  list(query: ListQuery): Promise<Paginated<ManagedUser>>
  /** Throws ConflictError when the email (any casing) is already in use. */
  create(data: NewManagedUser): Promise<ManagedUser>
  /** Throws NotFoundError for an unknown id. */
  update(id: string, changes: ManagedUserChanges): Promise<ManagedUser>
  /** Ids of the active Admins, row-locked until the transaction ends (last-Admin rule under concurrency). */
  lockActiveAdminIds(): Promise<string[]>
}
