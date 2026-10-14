import type { catalogLicenseType, DbExecutor } from '@sryg/db'
import type { CatalogListQuery, CatalogSlug, Paginated } from '@sryg/types'
import { and, asc, count, eq, ilike, or, type SQL } from 'drizzle-orm'
import { ConflictError, NotFoundError } from '../../shared/domain/errors'
import type { CatalogItem, CatalogItemChanges, NewCatalogItem } from '../domain/catalog-item'
import type { CatalogItemRepository } from '../domain/catalog-item-repository'
import { CATALOG_TABLES } from './drizzle-catalog-options.reader'

const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'

/** drizzle-orm wraps driver errors in `cause`; check both levels. */
function hasCode(error: unknown, expected: string): boolean {
  const code = (e: unknown) => (typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined)
  return code(error) === expected || code((error as { cause?: unknown } | null)?.cause) === expected
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

// Every catalog shares id/name_es/name_en/active/timestamps; license types add their own columns.
// The widest table type serves all of them: the use cases only send license-type fields to license types.
type CatalogTable = typeof catalogLicenseType
const tableOf = (catalog: CatalogSlug) => CATALOG_TABLES[catalog] as unknown as CatalogTable

const DUPLICATE = 'An item with this Spanish name already exists in the catalog'

/** Works against the pool or a transaction handle; the unit of work builds one per transaction. */
export class DrizzleCatalogItemRepository implements CatalogItemRepository {
  constructor(private readonly executor: DbExecutor) {}

  async findById(catalog: CatalogSlug, id: string): Promise<CatalogItem | null> {
    const table = tableOf(catalog)
    const [row] = await this.executor.select().from(table).where(eq(table.id, id)).limit(1)
    return (row as CatalogItem | undefined) ?? null
  }

  async list(catalog: CatalogSlug, { q, active, page, pageSize }: CatalogListQuery): Promise<Paginated<CatalogItem>> {
    const table = tableOf(catalog)
    const term = q ? `%${escapeLike(q)}%` : undefined
    const filter: SQL | undefined = and(
      term ? or(ilike(table.nameEs, term), ilike(table.nameEn, term)) : undefined,
      active === undefined ? undefined : eq(table.active, active),
    )
    const [items, [totals]] = await Promise.all([
      this.executor
        .select()
        .from(table)
        .where(filter)
        .orderBy(asc(table.nameEs), asc(table.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.executor.select({ total: count() }).from(table).where(filter),
    ])
    return { items: items as CatalogItem[], page, pageSize, total: totals?.total ?? 0 }
  }

  async create(catalog: CatalogSlug, data: NewCatalogItem): Promise<CatalogItem> {
    const table = tableOf(catalog)
    try {
      const [row] = await this.executor
        .insert(table)
        .values(data as typeof table.$inferInsert)
        .returning()
      return row as CatalogItem
    } catch (error) {
      if (hasCode(error, UNIQUE_VIOLATION)) throw new ConflictError(DUPLICATE)
      throw error
    }
  }

  async update(catalog: CatalogSlug, id: string, changes: CatalogItemChanges): Promise<CatalogItem> {
    const table = tableOf(catalog)
    try {
      const [row] = await this.executor.update(table).set(changes).where(eq(table.id, id)).returning()
      if (!row) throw new NotFoundError('Catalog item not found')
      return row as CatalogItem
    } catch (error) {
      if (hasCode(error, UNIQUE_VIOLATION)) throw new ConflictError(DUPLICATE)
      throw error
    }
  }

  async delete(catalog: CatalogSlug, id: string): Promise<void> {
    const table = tableOf(catalog)
    try {
      const [row] = await this.executor.delete(table).where(eq(table.id, id)).returning({ id: table.id })
      if (!row) throw new NotFoundError('Catalog item not found')
    } catch (error) {
      // Every reference to a catalog is ON DELETE RESTRICT (D19): an item in use stays and is deactivated.
      if (hasCode(error, FOREIGN_KEY_VIOLATION)) {
        throw new ConflictError('The item is in use and cannot be deleted; deactivate it instead')
      }
      throw error
    }
  }
}
