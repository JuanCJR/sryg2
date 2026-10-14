import type { CatalogSlug, Rav60Category, Rav67Class } from '@sryg/types'

/** Audit entity of each D19 catalog: its table name. */
export const CATALOG_ENTITIES = {
  'license-types': 'catalog_license_type',
  'type-ratings': 'catalog_type_rating',
  'class-ratings': 'catalog_class_rating',
  aircraft: 'catalog_aircraft',
  functions: 'catalog_function',
  'license-observations': 'catalog_license_observation',
  'medical-observations': 'catalog_medical_observation',
  'document-types': 'catalog_document_type',
  'attachment-types': 'catalog_attachment_type',
  nationalities: 'catalog_nationality',
} as const satisfies Record<CatalogSlug, string>

/** Extra columns of `catalog_license_type` (D13, D20, D3). */
export interface LicenseTypeFields {
  rav60Category: Rav60Category
  requiredMedicalClass: Rav67Class | null
  appliesExpiry: boolean
  validityMonths: number | null
  validityIsPlaceholder: boolean
}

/** One item of any catalog; license types also carry `LicenseTypeFields`. */
export interface CatalogItem extends Partial<LicenseTypeFields> {
  id: string
  nameEs: string
  nameEn: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export type NewCatalogItem = Pick<CatalogItem, 'nameEs' | 'nameEn'> & Partial<LicenseTypeFields>
export type CatalogItemChanges = Partial<Pick<CatalogItem, 'nameEs' | 'nameEn' | 'active'> & LicenseTypeFields>
