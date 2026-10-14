import { describe, expect, it } from 'vitest'
import type { PasswordHasher } from '../domain/password-hasher'
import type { NewUser, UserWriter } from '../domain/user-writer'
import { MissingSeedVariablesError, readSeedAdminInput, SeedAdminUseCase } from './seed-admin.use-case'

class FakeStore implements UserWriter {
  rows: NewUser[] = []
  calls = 0
  findByEmail(email: string) {
    this.calls++
    return Promise.resolve(this.rows.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null)
  }
  create(user: NewUser) {
    this.calls++
    this.rows.push(user)
    return Promise.resolve()
  }
}

const hasher: PasswordHasher = {
  hash: (plain) => Promise.resolve(`hash:${plain}`),
  verify: () => Promise.resolve(true),
}

const env = { SEED_ADMIN_EMAIL: 'admin@sryg.test', SEED_ADMIN_PASSWORD: 'S3cret-passphrase', SEED_ADMIN_NAME: 'Admin' }

describe('readSeedAdminInput', () => {
  it('returns trimmed values', () => {
    expect(readSeedAdminInput({ ...env, SEED_ADMIN_NAME: '  Admin  ' })).toEqual({
      email: 'admin@sryg.test',
      password: 'S3cret-passphrase',
      fullName: 'Admin',
    })
  })

  it('names every missing or empty variable', () => {
    const run = () => readSeedAdminInput({ SEED_ADMIN_EMAIL: '   ' })
    expect(run).toThrow(MissingSeedVariablesError)
    expect(run).toThrow(/SEED_ADMIN_EMAIL.*SEED_ADMIN_PASSWORD.*SEED_ADMIN_NAME/)
  })

  it('rejects an invalid email naming the variable', () => {
    expect(() => readSeedAdminInput({ ...env, SEED_ADMIN_EMAIL: 'nope' })).toThrow(/SEED_ADMIN_EMAIL/)
  })
})

describe('SeedAdminUseCase', () => {
  it('creates an active administrator with a hashed password', async () => {
    const store = new FakeStore()
    const outcome = await new SeedAdminUseCase(store, hasher).execute(readSeedAdminInput(env))
    expect(outcome).toBe('created')
    expect(store.rows).toEqual([
      {
        email: 'admin@sryg.test',
        fullName: 'Admin',
        role: 'administrador',
        area: 'ambas',
        passwordHash: 'hash:S3cret-passphrase',
        isActive: true,
        mustChangePassword: false,
      },
    ])
  })

  it('is idempotent: a second run (any email casing) inserts nothing and keeps the first hash', async () => {
    const store = new FakeStore()
    const useCase = new SeedAdminUseCase(store, hasher)
    await useCase.execute(readSeedAdminInput(env))
    const again = await useCase.execute(
      readSeedAdminInput({ ...env, SEED_ADMIN_EMAIL: 'ADMIN@sryg.test', SEED_ADMIN_PASSWORD: 'different-passphrase' }),
    )
    expect(again).toBe('exists')
    expect(store.rows).toHaveLength(1)
    expect(store.rows[0]?.passwordHash).toBe('hash:S3cret-passphrase')
  })
})
