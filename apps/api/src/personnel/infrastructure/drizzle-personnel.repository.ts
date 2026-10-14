import { certificadoMedico, type DbExecutor, licencia, personalAeronautico } from '@sryg/db'
import type { ListQuery, Paginated } from '@sryg/types'
import { asc, count, eq, ilike, or, type SQL, sql } from 'drizzle-orm'
import { ConflictError, NotFoundError } from '../../shared/domain/errors'
import type { NewPersonnel, Personnel, PersonnelChanges } from '../domain/personnel'
import type { PersonnelRepository } from '../domain/personnel-repository'

const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'

/** drizzle-orm wraps driver errors in `cause`; check both levels. */
function hasPgCode(error: unknown, expected: string): boolean {
  const code = (e: unknown) => (typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined)
  return code(error) === expected || code((error as { cause?: unknown } | null)?.cause) === expected
}
const isUniqueViolation = (error: unknown) => hasPgCode(error, UNIQUE_VIOLATION)

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

const p = personalAeronautico
// The record without the image bytes (D5), plus whether each image exists.
const personnelFields = {
  id: p.id,
  cedula: p.cedula,
  firstNames: p.firstNames,
  lastNames: p.lastNames,
  documentTypeId: p.documentTypeId,
  nationalityId: p.nationalityId,
  birthDate: p.birthDate,
  address: p.address,
  email: p.email,
  phone: p.phone,
  bloodType: p.bloodType,
  cargo: p.cargo,
  dependencia: p.dependencia,
  category: p.category,
  status: p.status,
  hasPhoto: sql<boolean>`(${p.photo} is not null)`.as('has_photo'),
  hasSignature: sql<boolean>`(${p.signature} is not null)`.as('has_signature'),
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
}

/** Works against the pool or a transaction handle; the unit of work builds one per transaction. */
export class DrizzlePersonnelRepository implements PersonnelRepository {
  constructor(private readonly executor: DbExecutor) {}

  async findById(id: string): Promise<Personnel | null> {
    const [row] = await this.executor
      .select(personnelFields)
      .from(personalAeronautico)
      .where(eq(personalAeronautico.id, id))
      .limit(1)
    return row ?? null
  }

  async list({ q, page, pageSize }: ListQuery): Promise<Paginated<Personnel>> {
    const term = q?.trim()
    const like = term ? `%${escapeLike(term)}%` : ''
    const filter: SQL | undefined = term
      ? or(
          ilike(sql`${personalAeronautico.firstNames} || ' ' || ${personalAeronautico.lastNames}`, like),
          ilike(sql`${personalAeronautico.lastNames} || ' ' || ${personalAeronautico.firstNames}`, like),
          ilike(personalAeronautico.cedula, `${escapeLike(term)}%`),
        )
      : undefined
    const [items, [totals]] = await Promise.all([
      this.executor
        .select(personnelFields)
        .from(personalAeronautico)
        .where(filter)
        .orderBy(asc(personalAeronautico.lastNames), asc(personalAeronautico.firstNames), asc(personalAeronautico.id))
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
        .returning({ id: personalAeronautico.id })
      return (await this.findById(row!.id))!
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
        .returning({ id: personalAeronautico.id })
      if (!row) throw new NotFoundError('Personnel not found')
      return (await this.findById(id))!
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('A person with this cedula already exists')
      throw error
    }
  }

  async hasCredentials(id: string): Promise<boolean> {
    const [licenses, certificates] = await Promise.all([
      this.executor.select({ id: licencia.id }).from(licencia).where(eq(licencia.personalId, id)).limit(1),
      this.executor
        .select({ id: certificadoMedico.id })
        .from(certificadoMedico)
        .where(eq(certificadoMedico.personalId, id))
        .limit(1),
    ])
    return licenses.length > 0 || certificates.length > 0
  }

  async delete(id: string): Promise<void> {
    try {
      await this.executor.delete(personalAeronautico).where(eq(personalAeronautico.id, id))
    } catch (error) {
      // Blocks (and any future RESTRICT reference) keep the person: refuse instead of a 500.
      if (hasPgCode(error, FOREIGN_KEY_VIOLATION)) throw new ConflictError('Other records reference this person')
      throw error
    }
  }
}
