import type { AuthUser, LoginResponse } from '@sryg/types'
import type { AuditLogRepository } from '../../audit/repositories/audit-log.repository'
import { InvalidCredentialsError } from '../../common/errors/domain-errors'
import type { StoredUser } from '../dtos/stored-user.dto'
import type { AccessLogRepository } from '../repositories/access-log.repository'
import type { UserRepository } from '../repositories/user.repository'
import type { Argon2PasswordHasher } from './argon2-password-hasher'
import type { JwtTokenIssuer } from './jwt-token-issuer'

export interface LoginContext {
  ip: string | null
}

const MAX_IDENTIFIER_LENGTH = 256

export function toAuthUser(user: StoredUser): AuthUser {
  const { id, email, fullName, role, area, mustChangePassword } = user
  return { id, email, fullName, role, area, mustChangePassword }
}

export class LoginService {
  /** `dummyHash` is verified for unknown emails so response time does not reveal whether an account exists. */
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: Argon2PasswordHasher,
    private readonly tokens: JwtTokenIssuer,
    private readonly dummyHash: string,
    private readonly audit: AuditLogRepository,
    private readonly access: AccessLogRepository,
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
