import { bloqueo, type DbExecutor, personalAeronautico, usuario } from '@sryg/db'
import type { ListBlocksQuery, Paginated } from '@sryg/types'
import { aliasedTable, and, count, desc, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm'
import { NotFoundError } from '../../common/errors/domain-errors'
import type { Block, NewBlock } from '../services/block'

const FOREIGN_KEY_VIOLATION = '23503'

/** drizzle-orm wraps driver errors in `cause`; check both levels. */
function isForeignKeyViolation(error: unknown): boolean {
  const code = (e: unknown) => (typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined)
  return (
    code(error) === FOREIGN_KEY_VIOLATION ||
    code((error as { cause?: unknown } | null)?.cause) === FOREIGN_KEY_VIOLATION
  )
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

const b = bloqueo
const p = personalAeronautico
const creator = aliasedTable(usuario, 'creator')
const resolver = aliasedTable(usuario, 'resolver')

const blockFields = {
  id: b.id,
  personalId: b.personalId,
  cedula: p.cedula,
  firstNames: p.firstNames,
  lastNames: p.lastNames,
  type: b.type,
  reason: b.reason,
  status: b.status,
  createdById: b.createdBy,
  createdByName: creator.fullName,
  createdAt: b.createdAt,
  resolvedById: b.resolvedBy,
  resolvedByName: resolver.fullName,
  resolvedAt: b.resolvedAt,
  resolutionNote: b.resolutionNote,
  updatedAt: b.updatedAt,
}

/** The block with its person and the names of who registered and who resolved it. */
function selectBlocks(executor: DbExecutor, where: SQL | undefined) {
  return executor
    .select(blockFields)
    .from(bloqueo)
    .innerJoin(personalAeronautico, eq(personalAeronautico.id, bloqueo.personalId))
    .innerJoin(creator, eq(creator.id, bloqueo.createdBy))
    .leftJoin(resolver, eq(resolver.id, bloqueo.resolvedBy))
    .where(where)
}

interface BlockRow {
  id: string
  personalId: string
  cedula: string
  firstNames: string
  lastNames: string
  type: Block['type']
  reason: string
  status: Block['status']
  createdById: string
  createdByName: string
  createdAt: Date
  resolvedById: string | null
  resolvedByName: string | null
  resolvedAt: Date | null
  resolutionNote: string | null
  updatedAt: Date
}

function toBlock(row: BlockRow): Block {
  return {
    id: row.id,
    personalId: row.personalId,
    person: { cedula: row.cedula, firstNames: row.firstNames, lastNames: row.lastNames },
    type: row.type,
    reason: row.reason,
    status: row.status,
    createdBy: { id: row.createdById, fullName: row.createdByName },
    createdAt: row.createdAt,
    resolvedBy: row.resolvedById ? { id: row.resolvedById, fullName: row.resolvedByName ?? '' } : null,
    resolvedAt: row.resolvedAt,
    resolutionNote: row.resolutionNote,
    updatedAt: row.updatedAt,
  }
}

/** Works against the pool or a transaction handle; the transaction runner builds one per transaction. */
export class BlockRepository {
  constructor(private readonly executor: DbExecutor) {}

  async findById(id: string): Promise<Block | null> {
    const [row] = await selectBlocks(this.executor, eq(bloqueo.id, id)).limit(1)
    return row ? toBlock(row) : null
  }

  async list({ q, status, type, personalId, page, pageSize }: ListBlocksQuery): Promise<Paginated<Block>> {
    const term = q?.trim()
    const like = term ? `%${escapeLike(term)}%` : ''
    const filter = and(
      status ? inArray(bloqueo.status, status) : undefined,
      type ? inArray(bloqueo.type, type) : undefined,
      personalId ? eq(bloqueo.personalId, personalId) : undefined,
      term
        ? or(
            ilike(sql`${p.firstNames} || ' ' || ${p.lastNames}`, like),
            ilike(sql`${p.lastNames} || ' ' || ${p.firstNames}`, like),
            ilike(p.cedula, `${escapeLike(term)}%`),
          )
        : undefined,
    )
    const [rows, [totals]] = await Promise.all([
      selectBlocks(this.executor, filter)
        .orderBy(desc(bloqueo.createdAt), desc(bloqueo.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.executor
        .select({ total: count() })
        .from(bloqueo)
        .innerJoin(personalAeronautico, eq(personalAeronautico.id, bloqueo.personalId))
        .where(filter),
    ])
    return { items: rows.map(toBlock), page, pageSize, total: totals?.total ?? 0 }
  }

  /** Throws NotFoundError when the person does not exist. */
  async create(data: NewBlock, actorId: string): Promise<Block> {
    try {
      const [row] = await this.executor
        .insert(bloqueo)
        .values({ ...data, status: 'activo', createdBy: actorId })
        .returning({ id: bloqueo.id })
      return (await this.findById(row!.id))!
    } catch (error) {
      if (isForeignKeyViolation(error)) throw new NotFoundError('Personnel not found')
      throw error
    }
  }

  /** Resolves the block only if it is still active; null when it is unknown or already resolved. */
  async resolve(id: string, resolutionNote: string, actorId: string): Promise<Block | null> {
    const [row] = await this.executor
      .update(bloqueo)
      .set({ status: 'resuelto', resolutionNote, resolvedBy: actorId, resolvedAt: sql`now()` })
      .where(and(eq(bloqueo.id, id), eq(bloqueo.status, 'activo')))
      .returning({ id: bloqueo.id })
    return row ? this.findById(row.id) : null
  }
}
