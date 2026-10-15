import { describe, expect, it } from 'vitest'
import type { AuditEntry } from '../../audit/dtos/audit-entry.dto'
import type { AuditLogRepository } from '../../audit/repositories/audit-log.repository'
import { InvalidCredentialsError } from '../../common/errors/domain-errors'
import { asReal, type PublicPart } from '../../test/fakes'
import type { AccessAttempt } from '../dtos/access-log.dto'
import type { StoredUser } from '../dtos/stored-user.dto'
import type { TokenClaims } from '../dtos/token-claims.dto'
import type { AccessLogRepository } from '../repositories/access-log.repository'
import type { UserRepository } from '../repositories/user.repository'
import type { Argon2PasswordHasher } from './argon2-password-hasher'
import type { JwtTokenIssuer } from './jwt-token-issuer'
import { LoginService } from './login.service'

const DUMMY = 'hash:dummy'

class FakeHasher implements Argon2PasswordHasher {
  verified: string[] = []
  hash(plain: string) {
    return Promise.resolve(`hash:${plain}`)
  }
  verify(hash: string, plain: string) {
    this.verified.push(hash)
    return Promise.resolve(hash === `hash:${plain}`)
  }
}

class FakeIssuer implements PublicPart<JwtTokenIssuer> {
  issued: TokenClaims[] = []
  issue(claims: TokenClaims) {
    this.issued.push(claims)
    return Promise.resolve({ accessToken: `token-for-${claims.sub}`, expiresIn: 3600 })
  }
}

class FakeAudit implements PublicPart<AuditLogRepository> {
  entries: AuditEntry[] = []
  record(entry: AuditEntry) {
    this.entries.push(entry)
    return Promise.resolve()
  }
}

class FakeAccessLog implements Pick<AccessLogRepository, 'record'> {
  attempts: AccessAttempt[] = []
  record(attempt: AccessAttempt) {
    this.attempts.push(attempt)
    return Promise.resolve()
  }
}

class FakeUsers implements Pick<UserRepository, 'findByEmail' | 'findById'> {
  constructor(private readonly users: StoredUser[]) {}
  findByEmail(email: string) {
    return Promise.resolve(this.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null)
  }
  findById(id: string) {
    return Promise.resolve(this.users.find((u) => u.id === id) ?? null)
  }
}

const admin: StoredUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@sryg.test',
  fullName: 'Admin',
  role: 'administrador',
  area: 'ambas',
  passwordHash: 'hash:correct-password',
  isActive: true,
  mustChangePassword: false,
}

const CONTEXT = { ip: '203.0.113.7' }

function setup(users: StoredUser[] = [admin]) {
  const hasher = new FakeHasher()
  const issuer = new FakeIssuer()
  const audit = new FakeAudit()
  const access = new FakeAccessLog()
  const login = new LoginService(
    asReal<UserRepository>(new FakeUsers(users)),
    hasher,
    asReal<JwtTokenIssuer>(issuer),
    DUMMY,
    asReal<AuditLogRepository>(audit),
    asReal<AccessLogRepository>(access),
  )
  const useCase = { execute: (input: { email: string; password: string }) => login.execute(input, CONTEXT) }
  return { hasher, issuer, audit, access, useCase }
}

describe('LoginService', () => {
  it('returns a token and public user data for valid credentials', async () => {
    const { useCase, issuer } = setup()
    const result = await useCase.execute({ email: 'admin@sryg.test', password: 'correct-password' })
    expect(result).toEqual({
      accessToken: `token-for-${admin.id}`,
      expiresIn: 3600,
      user: {
        id: admin.id,
        email: admin.email,
        fullName: 'Admin',
        role: 'administrador',
        area: 'ambas',
        mustChangePassword: false,
      },
    })
    expect(issuer.issued).toEqual([{ sub: admin.id, email: admin.email, role: 'administrador', area: 'ambas' }])
    expect(JSON.stringify(result)).not.toContain('hash:')
  })

  it('matches email case-insensitively', async () => {
    const { useCase } = setup()
    await expect(useCase.execute({ email: 'ADMIN@sryg.test', password: 'correct-password' })).resolves.toBeDefined()
  })

  it('rejects a wrong password with InvalidCredentialsError', async () => {
    const { useCase, issuer } = setup()
    await expect(useCase.execute({ email: admin.email, password: 'nope' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    )
    expect(issuer.issued).toEqual([])
  })

  it('verifies against the dummy hash for unknown emails and rejects identically', async () => {
    const { useCase, hasher } = setup()
    const failure = await useCase.execute({ email: 'ghost@sryg.test', password: 'x' }).catch((e: Error) => e)
    expect(failure).toBeInstanceOf(InvalidCredentialsError)
    expect(hasher.verified).toEqual([DUMMY])
    const wrong = await useCase.execute({ email: admin.email, password: 'x' }).catch((e: Error) => e)
    expect((failure as Error).message).toBe((wrong as Error).message)
  })

  it('rejects inactive users even with the right password, without revealing why', async () => {
    const { useCase, issuer } = setup([{ ...admin, isActive: false }])
    const failure = await useCase.execute({ email: admin.email, password: 'correct-password' }).catch((e: Error) => e)
    expect(failure).toBeInstanceOf(InvalidCredentialsError)
    expect(issuer.issued).toEqual([])
  })

  it('records an autenticar audit row for the user on success', async () => {
    const { useCase, audit } = setup()
    await useCase.execute({ email: admin.email, password: 'correct-password' })
    expect(audit.entries).toEqual([
      {
        actorId: admin.id,
        action: 'autenticar',
        entity: 'usuario',
        entityId: admin.id,
        changes: { after: { outcome: 'success' } },
      },
    ])
  })

  it('records an anonymous autenticar failure row without the email or the reason', async () => {
    const { useCase, audit } = setup([{ ...admin, isActive: false }])
    await useCase.execute({ email: admin.email, password: 'correct-password' }).catch(() => undefined)
    await useCase.execute({ email: 'ghost@sryg.test', password: 'x' }).catch(() => undefined)
    const failure = {
      actorId: null,
      action: 'autenticar',
      entity: 'usuario',
      entityId: null,
      changes: { after: { outcome: 'failure' } },
    }
    expect(audit.entries).toEqual([failure, failure])
    expect(JSON.stringify(audit.entries)).not.toContain('ghost')
  })

  it('records every attempt in the access log with the IP (D23)', async () => {
    const { useCase, access } = setup()
    await useCase.execute({ email: 'ADMIN@sryg.test ', password: 'correct-password' })
    await useCase.execute({ email: admin.email, password: 'wrong' }).catch(() => undefined)
    await useCase.execute({ email: 'Ghost@sryg.test', password: 'x' }).catch(() => undefined)
    expect(access.attempts).toEqual([
      { usuarioId: admin.id, identifier: 'admin@sryg.test', ip: CONTEXT.ip, success: true },
      { usuarioId: admin.id, identifier: 'admin@sryg.test', ip: CONTEXT.ip, success: false },
      { usuarioId: null, identifier: 'ghost@sryg.test', ip: CONTEXT.ip, success: false },
    ])
  })

  it('logs a failed attempt against an inactive user under that user', async () => {
    const { useCase, access } = setup([{ ...admin, isActive: false }])
    await useCase.execute({ email: admin.email, password: 'correct-password' }).catch(() => undefined)
    expect(access.attempts).toEqual([{ usuarioId: admin.id, identifier: admin.email, ip: CONTEXT.ip, success: false }])
  })
})
