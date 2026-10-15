import type { AuthUser } from '@sryg/types'
import { InvalidCredentialsError } from '../../common/errors/domain-errors'
import type { UserRepository } from '../repositories/user.repository'
import { toAuthUser } from './login.service'

export class GetCurrentUserService {
  constructor(private readonly users: UserRepository) {}

  /** A valid token for a user that no longer exists or was deactivated is treated as unauthenticated. */
  async execute(userId: string): Promise<AuthUser> {
    const user = await this.users.findById(userId)
    if (!user || !user.isActive) throw new InvalidCredentialsError('Invalid credentials')
    return toAuthUser(user)
  }
}
