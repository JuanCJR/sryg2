import type { AuthUser, LoginResponse } from '@sryg/types'
import type { AuditLog } from '../../audit/domain/audit-log'
import { InvalidCredentialsError } from '../../shared/domain/errors'
import type { AccessLog } from '../domain/access-log'
import type { PasswordHasher } from '../domain/password-hasher'
import type { TokenIssuer } from '../domain/token-issuer'
import type { StoredUser, UserRepository } from '../domain/user-repository'

export interface LoginContext {
  ip: string | null
}

const MAX_IDENTIFIER_LENGTH = 256

export function toAuthUser(user: StoredUser): AuthUser {
  const { id, email, fullName, role, area, mustChangePassword } = user
  return { id, email, fullName, role, area, mustChangePassword }
}

export class LoginUseCase {
  /** `dummyHash` is verified for unknown emails so response time does not reveal whether an account exists. */
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenIssuer,
    private readonly dummyHash: string,
    private readonly audit: AuditLog,
    private readonly access: AccessLog,
  ) {}

  async execute(input: { email: string; password: string }, context: LoginContext): Promise<LoginResponse> {
    const identifier = input.email.trim().toLowerCase().slice(0, MAX_IDENTIFIER_LENGTH)
    const user = await this.users.findByEmail(identifier)
    const passwordOk = await this.hasher.verify(user?.passwordHash ?? this.dummyHash, input.password)
    const success = Boolean(user && passwordOk && user.isActive)
    await this.access.record({ usuarioId: user?.id ?? null, identifier, ip: context.ip, success })
    // Same error for unknown email, wrong password and inactive user: no account enumeration.
    if (!user || !success) {
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
    const { accessToken, expiresIn } = await this.tokens.issue({
      sub: user.id,
      email: user.email,
      role: user.role,
      area: user.area,
    })
    return { accessToken, expiresIn, user: toAuthUser(user) }
  }
}
