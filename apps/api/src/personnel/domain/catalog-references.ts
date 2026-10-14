/** Catalogs the person's record points to (D21). */
export type PersonnelCatalog = 'document-types' | 'nationalities' | 'attachment-types'

export interface CatalogReferences {
  /** Whether `id` names an existing, active item of `catalog`. */
  isActive(catalog: PersonnelCatalog, id: string): Promise<boolean>
}
