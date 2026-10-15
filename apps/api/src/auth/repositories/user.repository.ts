import { Inject, Injectable } from '@nestjs/common'
import { eq, sql } from 'drizzle-orm'
import { type Db, usuario } from '@sryg/db'
import { DB } from '../../common/database/database.module'
import type { NewUser } from '../dtos/new-user.dto'
import type { StoredUser } from '../dtos/stored-user.dto'

@Injectable()
export class UserRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Case-insensitive lookup. */
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
