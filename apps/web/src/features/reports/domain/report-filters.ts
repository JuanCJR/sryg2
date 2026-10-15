import type { CatalogOption, Rav60Category, ReportFilters, ReportId, ReportStatus } from '@sryg/types'
import { STATUS_FILTERS } from './report-view'

/** What the filter panel edits; the license type keeps the whole option so its label shows. */
export interface ReportFilterValues {
  q: string
  licenseType: CatalogOption | null
  /** Checked categories; none checked = every category. */
  rav60Category: Rav60Category[]
  /** Checked statuses; none checked = every status. */
  status: ReportStatus[]
  from: string
  to: string
}

export const EMPTY_FILTERS: ReportFilterValues = {
  q: '',
  licenseType: null,
  rav60Category: [],
  status: [],
  from: '',
  to: '',
}

/** The filters as the API reads them; `q` is passed apart because the container debounces it. */
export function toReportFilters(values: ReportFilterValues, q: string, report: ReportId): ReportFilters {
  // Statuses the report cannot be filtered by (none for active blocks) never reach the API.
  const status = values.status.filter((value) => STATUS_FILTERS[report].includes(value))
  return {
    q: q || undefined,
    licenseTypeId: values.licenseType ? [values.licenseType.id] : undefined,
    rav60Category: values.rav60Category.length ? [...values.rav60Category] : undefined,
    status: status.length ? status : undefined,
    from: values.from || undefined,
    to: values.to || undefined,
  }
}

/** How many filters narrow the report (each date bound counts on its own). */
export function countActiveFilters(values: ReportFilterValues, report: ReportId): number {
  const status = values.status.filter((value) => STATUS_FILTERS[report].includes(value))
  return [
    values.q.trim(),
    values.licenseType,
    values.rav60Category.length,
    status.length,
    values.from,
    values.to,
  ].filter(Boolean).length
}
