import { ConflictError } from '../../common/errors/domain-errors'
import type { ManagedUser } from './managed-user'

/**
 * AUTH-06: the system always keeps at least one active Admin. Throws when `next` would take the
 * user out of the set of active Admins and nobody else is left in it. `activeAdminIds` must be read
 * (and locked) inside the same transaction as the write.
 */
export function assertKeepsAnActiveAdmin(
  activeAdminIds: readonly string[],
  user: ManagedUser,
  next: Pick<ManagedUser, 'role' | 'isActive'>,
): void {
  const isActiveAdmin = (u: Pick<ManagedUser, 'role' | 'isActive'>) => u.role === 'administrador' && u.isActive
  if (!isActiveAdmin(user) || isActiveAdmin(next)) return
  if (activeAdminIds.some((id) => id !== user.id)) return
  throw new ConflictError('The last active Admin cannot be deactivated or demoted')
}
