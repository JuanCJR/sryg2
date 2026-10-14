import { z } from 'zod'
import type { PasswordHasher } from '../domain/password-hasher'
import type { UserWriter } from '../domain/user-writer'

export interface SeedAdminInput {
  email: string
  password: string
  fullName: string
}

export class MissingSeedVariablesError extends Error {
  constructor(readonly variables: string[]) {
    super(`Missing or invalid seed variables: ${variables.join(', ')}`)
    this.name = 'MissingSeedVariablesError'
  }
}

/** Reads the admin credentials from env; throws naming every missing, empty or invalid variable. */
export function readSeedAdminInput(env: Record<string, string | undefined>): SeedAdminInput {
  const value = (name: string) => env[name]?.trim() ?? ''
  const email = value('SEED_ADMIN_EMAIL')
  const password = value('SEED_ADMIN_PASSWORD')
  const fullName = value('SEED_ADMIN_NAME')
  const invalid = [
    !z.email().safeParse(email).success && 'SEED_ADMIN_EMAIL',
    !password && 'SEED_ADMIN_PASSWORD',
    !fullName && 'SEED_ADMIN_NAME',
  ].filter((name): name is string => Boolean(name))
  if (invalid.length > 0) throw new MissingSeedVariablesError(invalid)
  return { email, password, fullName }
}

export class SeedAdminUseCase {
  constructor(
    private readonly users: UserWriter,
    private readonly hasher: PasswordHasher,
  ) {}

  /** Idempotent: an existing user with the same email (case-insensitive) is left untouched. */
  async execute(input: SeedAdminInput): Promise<'created' | 'exists'> {
    if (await this.users.findByEmail(input.email)) return 'exists'
    await this.users.create({
      email: input.email,
      fullName: input.fullName,
      role: 'administrador',
      area: 'ambas',
      passwordHash: await this.hasher.hash(input.password),
      isActive: true,
      mustChangePassword: false,
    })
    return 'created'
  }
}
