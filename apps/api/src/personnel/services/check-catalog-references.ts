import type { PersonnelCatalog } from '../dtos/personnel-catalog.dto'
import type { CatalogReferencesRepository } from '../repositories/catalog-references.repository'
import { InvalidPersonnelFieldError } from './personnel-errors'

const FIELDS: Array<['documentTypeId' | 'nationalityId', PersonnelCatalog]> = [
  ['documentTypeId', 'document-types'],
  ['nationalityId', 'nationalities'],
]

/**
 * D21: document type and nationality come from their catalogs. A new value must name an active
 * item; a value the record already holds is kept even if the Admin deactivated it since.
 */
export async function checkCatalogReferences(
  catalogs: CatalogReferencesRepository,
  input: { documentTypeId?: string | null; nationalityId?: string | null },
  current?: { documentTypeId: string | null; nationalityId: string | null },
): Promise<void> {
  for (const [field, catalog] of FIELDS) {
    const value = input[field]
    if (!value || value === current?.[field]) continue
    if (!(await catalogs.isActive(catalog, value))) {
      throw new InvalidPersonnelFieldError(field, 'Unknown or inactive catalog item')
    }
  }
}
