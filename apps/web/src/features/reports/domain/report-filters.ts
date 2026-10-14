import type { CatalogOption, Rav60Category, ReportStatus } from '@sryg/types'

/** What the filter bar edits; the license type keeps the whole option so its label shows. */
export interface ReportFilterValues {
  q: string
  licenseType: CatalogOption | null
  rav60Category: Rav60Category | ''
  status: ReportStatus | ''
  from: string
  to: string
}

export const EMPTY_FILTERS: ReportFilterValues = {
  q: '',
  licenseType: null,
  rav60Category: '',
  status: '',
  from: '',
  to: '',
}
