import type { PasswordHasher } from '../../auth/domain/password-hasher'
import { NotFoundError } from '../../shared/domain/errors'
import { type Actor, type ManagedUser, USER_ENTITY } from '../domain/managed-user'
import type { TemporaryPasswordGenerator } from '../domain/temporary-password-generator'
import type { UsersUnitOfWork } from '../domain/users-unit-of-work'

export class ResetUserPasswordUseCase {
  constructor(
    private readonly uow: UsersUnitOfWork,
    private readonly hasher: PasswordHasher,
    private readonly passwords: TemporaryPasswordGenerator,
  ) {}

  /** D4 / D14: a new temporary password, shown once; the next login must change it. */
  async execute(actor: Actor, id: string): Promise<{ user: ManagedUser; temporaryPassword: string }> {
    const temporaryPassword = this.passwords.generate()
    const passwordHash = await this.hasher.hash(temporaryPassword)
    const user = await this.uow.run(async ({ users, audit }) => {
      const current = await users.findById(id)
      if (!current) throw new NotFoundError('User not found')
      const updated = await users.update(id, { passwordHash, mustChangePassword: true })
      await audit.record({
        actorId: actor.id,
        action: 'restablecer_contrasena',
        entity: USER_ENTITY,
        entityId: id,
        // Never the password or its hash.
        changes: { before: { mustChangePassword: current.mustChangePassword }, after: { mustChangePassword: true } },
      })
      return updated
    })
    return { user, temporaryPassword }
  }
}
