import { catalogAttachmentType, catalogDocumentType, catalogNationality, type DbExecutor } from '@sryg/db'
import { and, eq } from 'drizzle-orm'
import type { PersonnelCatalog } from '../dtos/personnel-catalog.dto'

const TABLES = {
  'document-types': catalogDocumentType,
  nationalities: catalogNationality,
  'attachment-types': catalogAttachmentType,
} satisfies Record<PersonnelCatalog, unknown>

// The three catalogs share the same columns; this shape is enough to query any of them.
type CatalogTable = typeof catalogNationality

export class CatalogReferencesRepository {
  constructor(private readonly executor: DbExecutor) {}

  /** Whether `id` names an existing, active item of `catalog`. */
  async isActive(catalog: PersonnelCatalog, id: string): Promise<boolean> {
    const table = TABLES[catalog] as unknown as CatalogTable
    const rows = await this.executor
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.id, id), eq(table.active, true)))
      .limit(1)
    return rows.length > 0
  }
}
