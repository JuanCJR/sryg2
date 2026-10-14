import { Inject, Injectable } from '@nestjs/common'
import { eq, sql } from 'drizzle-orm'
import { type Db, usuario } from '@sryg/db'
import { DB } from '../../infrastructure/database/database.module'
import type { StoredUser, UserRepository } from '../domain/user-repository'
import type { NewUser, UserWriter } from '../domain/user-writer'

@Injectable()
export class DrizzleUserRepository implements UserRepository, UserWriter {
  constructor(@Inject(DB) private readonly db: Db) {}

  async findByEmail(email: string): Promise<StoredUser | null> {
    const [row] = await this.db
      .select()
      .from(usuario)
      .where(sql`lower(${usuario.email}) = lower(${email})`)
      .limit(1)
    return row ?? null
  }

  async findById(id: string): Promise<StoredUser | null> {
    const [row] = await this.db.select().from(usuario).where(eq(usuario.id, id)).limit(1)
    return row ?? null
  }

  async create(user: NewUser): Promise<void> {
    await this.db.insert(usuario).values(user).onConflictDoNothing()
  }
}
