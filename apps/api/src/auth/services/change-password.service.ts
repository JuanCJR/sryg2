import type { ChangePasswordInput } from '@sryg/types'
import { ForbiddenError, InvalidCredentialsError } from '../../common/errors/domain-errors'
import type { AccountTransaction } from '../auth.types'
import type { UserRepository } from '../repositories/user.repository'
import type { Argon2PasswordHasher } from './argon2-password-hasher'

export class ChangePasswordService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: Argon2PasswordHasher,
    private readonly transaction: AccountTransaction,
  ) {}

  /**
   * AUTH-08 / D4: the user proves the current password and sets a new one (length already checked
   * by the contract); a pending forced change is cleared. A wrong current password is a 403, not a
   * 401: the session itself is still valid and the web must not sign the user out.
   */
  async execute(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.users.findById(userId)
    if (!user || !user.isActive) throw new InvalidCredentialsError('Invalid credentials')
    if (!(await this.hasher.verify(user.passwordHash, input.currentPassword)))
      throw new ForbiddenError('The current password is not correct')

    const passwordHash = await this.hasher.hash(input.newPassword)
    await this.transaction.run(async ({ passwords, audit }) => {
      await passwords.setOwnPassword(user.id, passwordHash)
      await audit.record({
        actorId: user.id,
        action: 'actualizar',
        entity: 'usuario',
        entityId: user.id,
        // Never the password or its hash: only the fact that it changed.
        changes: {
          before: { mustChangePassword: user.mustChangePassword },
          after: { mustChangePassword: false, passwordChanged: true },
        },
      })
    })
  }
}
