import type { CreateUserInput } from '@sryg/types'
import type { Argon2PasswordHasher } from '../../auth/services/argon2-password-hasher'
import type { UsersTransaction } from '../users.types'
import type { CryptoTemporaryPasswordGenerator } from './crypto-temporary-password-generator'
import { type Actor, type ManagedUser, USER_ENTITY } from './managed-user'

export class CreateUserService {
  constructor(
    private readonly transaction: UsersTransaction,
    private readonly hasher: Argon2PasswordHasher,
    private readonly passwords: CryptoTemporaryPasswordGenerator,
  ) {}

  /** AUTH-06 / D14: the account starts with a temporary password that must be changed on first login (D4). */
  async execute(actor: Actor, input: CreateUserInput): Promise<{ user: ManagedUser; temporaryPassword: string }> {
    const temporaryPassword = this.passwords.generate()
    const passwordHash = await this.hasher.hash(temporaryPassword)
    const user = await this.transaction.run(async ({ users, audit }) => {
      // The entity is written first: a duplicate email throws before any audit row exists.
      const created = await users.create({
        email: input.email.trim(),
        fullName: input.fullName,
        role: input.role,
        area: input.area,
        passwordHash,
        mustChangePassword: true,
      })
      await audit.record({
        actorId: actor.id,
        action: 'crear',
        entity: USER_ENTITY,
        entityId: created.id,
        changes: { after: created },
      })
      return created
    })
    return { user, temporaryPassword }
  }
}
