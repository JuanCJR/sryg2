import type { AuthUser } from '@sryg/types'
import { InvalidCredentialsError } from '../../shared/domain/errors'
import type { UserRepository } from '../domain/user-repository'
import { toAuthUser } from './login.use-case'

export class GetCurrentUserUseCase {
  constructor(private readonly users: UserRepository) {}

  /** A valid token for a user that no longer exists or was deactivated is treated as unauthenticated. */
  async execute(userId: string): Promise<AuthUser> {
    const user = await this.users.findById(userId)
    if (!user || !user.isActive) throw new InvalidCredentialsError('Invalid credentials')
    return toAuthUser(user)
  }
}
