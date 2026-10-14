import type { UpdateUserInput } from '@sryg/types'
import { NotFoundError } from '../../shared/domain/errors'
import { assertKeepsAnActiveAdmin } from '../domain/last-active-admin'
import { type Actor, type ManagedUser, type ManagedUserChanges, USER_ENTITY } from '../domain/managed-user'
import type { UsersUnitOfWork } from '../domain/users-unit-of-work'

type EditableChanges = Pick<ManagedUserChanges, 'fullName' | 'role' | 'area' | 'isActive'>

export class UpdateUserUseCase {
  constructor(private readonly uow: UsersUnitOfWork) {}

  /** Name, role and area (PATCH) or the active flag (activate/deactivate). Audits only what changed. */
  execute(actor: Actor, id: string, input: UpdateUserInput | Pick<ManagedUser, 'isActive'>): Promise<ManagedUser> {
    return this.uow.run(async ({ users, audit }) => {
      // Locked before reading the user, so two Admins demoting each other cannot both pass the check.
      const activeAdminIds = await users.lockActiveAdminIds()
      const current = await users.findById(id)
      if (!current) throw new NotFoundError('User not found')

      const before: Record<string, unknown> = {}
      const changes: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(input as EditableChanges)) {
        const previous = current[key as keyof EditableChanges]
        if (value === undefined || value === previous) continue
        before[key] = previous
        changes[key] = value
      }
      // Nothing actually changed: no write and no audit row for a change that did not occur.
      if (Object.keys(changes).length === 0) return current

      assertKeepsAnActiveAdmin(activeAdminIds, current, { ...current, ...(changes as EditableChanges) })
      const updated = await users.update(id, changes as EditableChanges)
      await audit.record({
        actorId: actor.id,
        action: 'actualizar',
        entity: USER_ENTITY,
        entityId: id,
        changes: { before, after: changes },
      })
      return updated
    })
  }
}
