import { type DbExecutor, usuario } from '@sryg/db'
import type { ListQuery, Paginated } from '@sryg/types'
import { and, asc, count, eq, ilike, or, type SQL } from 'drizzle-orm'
import { ConflictError, NotFoundError } from '../../shared/domain/errors'
import type { ManagedUser, ManagedUserChanges, NewManagedUser } from '../domain/managed-user'
import type { UserAdminRepository } from '../domain/user-admin-repository'

const UNIQUE_VIOLATION = '23505'

/** drizzle-orm wraps driver errors in `cause`; check both levels. */
function isUniqueViolation(error: unknown): boolean {
  const code = (e: unknown) => (typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined)
  return code(error) === UNIQUE_VIOLATION || code((error as { cause?: unknown } | null)?.cause) === UNIQUE_VIOLATION
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

const u = usuario
// Everything but the password hash.
const userFields = {
  id: u.id,
  email: u.email,
  fullName: u.fullName,
  role: u.role,
  area: u.area,
  isActive: u.isActive,
  mustChangePassword: u.mustChangePassword,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
}

/** Works against the pool or a transaction handle; the unit of work builds one per transaction. */
export class DrizzleUserAdminRepository implements UserAdminRepository {
  constructor(private readonly executor: DbExecutor) {}

  async findById(id: string): Promise<ManagedUser | null> {
    const [row] = await this.executor.select(userFields).from(usuario).where(eq(usuario.id, id)).limit(1)
    return row ?? null
  }

  async list({ q, page, pageSize }: ListQuery): Promise<Paginated<ManagedUser>> {
    const term = q?.trim()
    const like = term ? `%${escapeLike(term)}%` : ''
    const filter: SQL | undefined = term ? or(ilike(usuario.fullName, like), ilike(usuario.email, like)) : undefined
    const [items, [totals]] = await Promise.all([
      this.executor
        .select(userFields)
        .from(usuario)
        .where(filter)
        .orderBy(asc(usuario.fullName), asc(usuario.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.executor.select({ total: count() }).from(usuario).where(filter),
    ])
    return { items, page, pageSize, total: totals?.total ?? 0 }
  }

  async create(data: NewManagedUser): Promise<ManagedUser> {
    try {
      const [row] = await this.executor.insert(usuario).values(data).returning(userFields)
      return row!
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('A user with this email already exists')
      throw error
    }
  }

  async update(id: string, changes: ManagedUserChanges): Promise<ManagedUser> {
    const [row] = await this.executor.update(usuario).set(changes).where(eq(usuario.id, id)).returning(userFields)
    if (!row) throw new NotFoundError('User not found')
    return row
  }

  async lockActiveAdminIds(): Promise<string[]> {
    const rows = await this.executor
      .select({ id: usuario.id })
      .from(usuario)
      .where(and(eq(usuario.role, 'administrador'), eq(usuario.isActive, true)))
      .for('update')
    return rows.map((row) => row.id)
  }
}
