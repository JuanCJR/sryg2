import { type DbExecutor, usuario } from '@sryg/db'
import { eq } from 'drizzle-orm'
import type { PasswordWriter } from '../domain/account-unit-of-work'

export class DrizzlePasswordWriter implements PasswordWriter {
  constructor(private readonly executor: DbExecutor) {}

  async setOwnPassword(userId: string, passwordHash: string): Promise<void> {
    await this.executor.update(usuario).set({ passwordHash, mustChangePassword: false }).where(eq(usuario.id, userId))
  }
}
