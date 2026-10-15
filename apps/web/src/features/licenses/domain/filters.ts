import type { CatalogOption } from '@sryg/types'

/** The license query's filter values, as the left panel edits them. */
export interface LicenseFilterValues {
  solicitante: string
  numero: string
  tipo: CatalogOption | null
  venceDesde: string
  venceHasta: string
}

export const EMPTY_LICENSE_FILTERS: LicenseFilterValues = {
  solicitante: '',
  numero: '',
  tipo: null,
  venceDesde: '',
  venceHasta: '',
}

/** How many filters narrow the list: each filled field counts once (the expiry range counts per end). */
export function activeLicenseFilterCount(values: LicenseFilterValues): number {
  return [values.solicitante.trim(), values.numero.trim(), values.tipo, values.venceDesde, values.venceHasta].filter(
    Boolean,
  ).length
}
