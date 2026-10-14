import { describe, expect, it } from 'vitest'
import { InvalidCredentialsError } from '../../shared/domain/errors'
import type { AuditEntry, AuditLog } from '../../audit/domain/audit-log'
import type { PasswordHasher } from '../domain/password-hasher'
import type { TokenClaims, TokenIssuer } from '../domain/token-issuer'
import type { StoredUser, UserRepository } from '../domain/user-repository'
import { LoginUseCase } from './login.use-case'

const DUMMY = 'hash:dummy'

class FakeHasher implements PasswordHasher {
  verified: string[] = []
  hash(plain: string) {
    return Promise.resolve(`hash:${plain}`)
  }
  verify(hash: string, plain: string) {
    this.verified.push(hash)
    return Promise.resolve(hash === `hash:${plain}`)
  }
}

class FakeIssuer implements TokenIssuer {
  issued: TokenClaims[] = []
  issue(claims: TokenClaims) {
    this.issued.push(claims)
    return Promise.resolve({ accessToken: `token-for-${claims.sub}`, expiresIn: 3600 })
  }
}

class FakeAudit implements AuditLog {
  entries: AuditEntry[] = []
  record(entry: AuditEntry) {
    this.entries.push(entry)
    return Promise.resolve()
  }
}

class FakeUsers implements UserRepository {
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
  passwordHash: 'hash:correct-password',
  isActive: true,
}

function setup(users: StoredUser[] = [admin]) {
  const hasher = new FakeHasher()
  const issuer = new FakeIssuer()
  const audit = new FakeAudit()
  const useCase = new LoginUseCase(new FakeUsers(users), hasher, issuer, DUMMY, audit)
  return { hasher, issuer, audit, useCase }
}

describe('LoginUseCase', () => {
  it('returns a token and public user data for valid credentials', async () => {
    const { useCase, issuer } = setup()
    const result = await useCase.execute({ email: 'admin@sryg.test', password: 'correct-password' })
    expect(result).toEqual({
      accessToken: `token-for-${admin.id}`,
      expiresIn: 3600,
      user: { id: admin.id, email: admin.email, fullName: 'Admin', role: 'administrador' },
    })
    expect(issuer.issued).toEqual([{ sub: admin.id, email: admin.email, role: 'administrador' }])
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
})
