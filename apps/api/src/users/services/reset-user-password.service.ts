import type { Argon2PasswordHasher } from '../../auth/services/argon2-password-hasher'
import { NotFoundError } from '../../common/errors/domain-errors'
import type { UsersTransaction } from '../users.types'
import type { CryptoTemporaryPasswordGenerator } from './crypto-temporary-password-generator'
import { type Actor, type ManagedUser, USER_ENTITY } from './managed-user'

export class ResetUserPasswordService {
  constructor(
    private readonly transaction: UsersTransaction,
    private readonly hasher: Argon2PasswordHasher,
    private readonly passwords: CryptoTemporaryPasswordGenerator,
  ) {}

  /** D4 / D14: a new temporary password, shown once; the next login must change it. */
  async execute(actor: Actor, id: string): Promise<{ user: ManagedUser; temporaryPassword: string }> {
    const temporaryPassword = this.passwords.generate()
    const passwordHash = await this.hasher.hash(temporaryPassword)
    const user = await this.transaction.run(async ({ users, audit }) => {
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
