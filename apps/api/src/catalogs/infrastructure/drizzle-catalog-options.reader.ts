import {
  catalogAircraft,
  catalogAttachmentType,
  catalogClassRating,
  catalogDocumentType,
  catalogFunction,
  catalogLicenseObservation,
  catalogLicenseType,
  catalogMedicalObservation,
  catalogNationality,
  catalogTypeRating,
  type DbExecutor,
} from '@sryg/db'
import type { CatalogOption, CatalogOptionsQuery, CatalogSlug } from '@sryg/types'
import { and, asc, eq, ilike, or } from 'drizzle-orm'
import type { CatalogOptionsReader } from '../domain/catalog-options-reader'

/** Slug of the D19 catalog → its table. Shared with the catalog CRUD (W1-11). */
export const CATALOG_TABLES = {
  'license-types': catalogLicenseType,
  'type-ratings': catalogTypeRating,
  'class-ratings': catalogClassRating,
  aircraft: catalogAircraft,
  functions: catalogFunction,
  'license-observations': catalogLicenseObservation,
  'medical-observations': catalogMedicalObservation,
  'document-types': catalogDocumentType,
  'attachment-types': catalogAttachmentType,
  nationalities: catalogNationality,
} satisfies Record<CatalogSlug, unknown>

// Every catalog shares id/name_es/name_en/active; this shape is enough to query any of them.
type CatalogTable = typeof catalogNationality

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

export class DrizzleCatalogOptionsReader implements CatalogOptionsReader {
  constructor(private readonly executor: DbExecutor) {}

  options(catalog: CatalogSlug, { q, limit }: CatalogOptionsQuery): Promise<CatalogOption[]> {
    const table = CATALOG_TABLES[catalog] as unknown as CatalogTable
    const term = q ? `%${escapeLike(q)}%` : undefined
    return this.executor
      .select({ id: table.id, nameEs: table.nameEs, nameEn: table.nameEn })
      .from(table)
      .where(and(eq(table.active, true), term ? or(ilike(table.nameEs, term), ilike(table.nameEn, term)) : undefined))
      .orderBy(asc(table.nameEs), asc(table.id))
      .limit(limit)
  }
}
