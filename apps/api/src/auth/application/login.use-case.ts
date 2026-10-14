import type { LoginResponse } from '@sryg/types'
import type { AuditLog } from '../../audit/domain/audit-log'
import { InvalidCredentialsError } from '../../shared/domain/errors'
import type { PasswordHasher } from '../domain/password-hasher'
import type { TokenIssuer } from '../domain/token-issuer'
import type { UserRepository } from '../domain/user-repository'

export class LoginUseCase {
  /** `dummyHash` is verified for unknown emails so response time does not reveal whether an account exists. */
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenIssuer,
    private readonly dummyHash: string,
    private readonly audit: AuditLog,
  ) {}

  async execute(input: { email: string; password: string }): Promise<LoginResponse> {
    const user = await this.users.findByEmail(input.email)
    const passwordOk = await this.hasher.verify(user?.passwordHash ?? this.dummyHash, input.password)
    // Same error for unknown email, wrong password and inactive user: no account enumeration.
    if (!user || !passwordOk || !user.isActive) {
      // Anonymous row: neither the email nor the failure reason is stored.
      await this.audit.record({
        actorId: null,
        action: 'autenticar',
        entity: 'usuario',
        entityId: null,
        changes: { after: { outcome: 'failure' } },
      })
      throw new InvalidCredentialsError('Invalid credentials')
    }
    await this.audit.record({
      actorId: user.id,
      action: 'autenticar',
      entity: 'usuario',
      entityId: user.id,
      changes: { after: { outcome: 'success' } },
    })
    const { accessToken, expiresIn } = await this.tokens.issue({ sub: user.id, email: user.email, role: user.role })
    return {
      accessToken,
      expiresIn,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    }
  }
}
