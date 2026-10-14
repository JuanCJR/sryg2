import { type DbExecutor, personalAeronautico } from '@sryg/db'
import type { ListQuery, Paginated } from '@sryg/types'
import { asc, count, eq, ilike, or, type SQL } from 'drizzle-orm'
import { ConflictError, NotFoundError } from '../../shared/domain/errors'
import type { NewPersonnel, Personnel, PersonnelChanges } from '../domain/personnel'
import type { PersonnelRepository } from '../domain/personnel-repository'

const UNIQUE_VIOLATION = '23505'

/** drizzle-orm wraps driver errors in `cause`; check both levels. */
function isUniqueViolation(error: unknown): boolean {
  const code = (e: unknown) => (typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined)
  return code(error) === UNIQUE_VIOLATION || code((error as { cause?: unknown } | null)?.cause) === UNIQUE_VIOLATION
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

/** Works against the pool or a transaction handle; the unit of work builds one per transaction. */
export class DrizzlePersonnelRepository implements PersonnelRepository {
  constructor(private readonly executor: DbExecutor) {}

  async findById(id: string): Promise<Personnel | null> {
    const [row] = await this.executor.select().from(personalAeronautico).where(eq(personalAeronautico.id, id)).limit(1)
    return row ?? null
  }

  async list({ q, page, pageSize }: ListQuery): Promise<Paginated<Personnel>> {
    const term = q?.trim()
    const filter: SQL | undefined = term
      ? or(
          ilike(personalAeronautico.fullName, `%${escapeLike(term)}%`),
          ilike(personalAeronautico.cedula, `${escapeLike(term)}%`),
        )
      : undefined
    const [items, [totals]] = await Promise.all([
      this.executor
        .select()
        .from(personalAeronautico)
        .where(filter)
        .orderBy(asc(personalAeronautico.fullName), asc(personalAeronautico.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.executor.select({ total: count() }).from(personalAeronautico).where(filter),
    ])
    return { items, page, pageSize, total: totals?.total ?? 0 }
  }

  async create(data: NewPersonnel, actorId: string): Promise<Personnel> {
    try {
      const [row] = await this.executor
        .insert(personalAeronautico)
        .values({ ...data, createdBy: actorId, updatedBy: actorId })
        .returning()
      return row!
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('A person with this cedula already exists')
      throw error
    }
  }

  async update(id: string, changes: PersonnelChanges, actorId: string): Promise<Personnel> {
    try {
      const [row] = await this.executor
        .update(personalAeronautico)
        .set({ ...changes, updatedBy: actorId })
        .where(eq(personalAeronautico.id, id))
        .returning()
      if (!row) throw new NotFoundError('Personnel not found')
      return row
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('A person with this cedula already exists')
      throw error
    }
  }
}
