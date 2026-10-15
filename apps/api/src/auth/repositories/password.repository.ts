import { type DbExecutor, usuario } from '@sryg/db'
import { eq } from 'drizzle-orm'

export class PasswordRepository {
  constructor(private readonly executor: DbExecutor) {}

  /** Stores the new hash and clears `must_change_password` (D4). */
  async setOwnPassword(userId: string, passwordHash: string): Promise<void> {
    await this.executor.update(usuario).set({ passwordHash, mustChangePassword: false }).where(eq(usuario.id, userId))
  }
}
