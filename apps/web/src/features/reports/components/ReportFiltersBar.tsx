import type { Rav60Category, ReportId, ReportStatus } from '@sryg/types'
import { RAV60_CATEGORIES } from '@sryg/types'
import { DateInput, FormField, Input, Select } from '../../../design-system'
import { CatalogSelect } from '../../catalogs/CatalogSelect'
import type { ReportFilterValues } from '../domain/report-filters'
import { DATE_RANGE_LABELS, RAV60_LABELS, STATUS_FILTERS, STATUS_LABELS } from '../domain/report-view'
import styles from './ReportFiltersBar.module.css'

export interface ReportFiltersBarProps {
  report: ReportId
  value: ReportFilterValues
  onChange: (value: ReportFilterValues) => void
  /** Shown under the "hasta" field when the range is inverted. */
  rangeError?: string
}

/** The D10 filters: holder, license type, RAV 60 category, status (not for blocks) and date range. */
export function ReportFiltersBar({ report, value, onChange, rangeError }: ReportFiltersBarProps) {
  const set = <K extends keyof ReportFilterValues>(key: K, next: ReportFilterValues[K]) =>
    onChange({ ...value, [key]: next })
  const statuses = STATUS_FILTERS[report]
  const range = DATE_RANGE_LABELS[report]

  return (
    <div className={styles.bar}>
      <div className={styles.wide}>
        <FormField label="Titular">
          {(field) => (
            <Input
              {...field}
              type="search"
              placeholder="Nombre o cédula…"
              value={value.q}
              onChange={(event) => set('q', event.target.value)}
            />
          )}
        </FormField>
      </div>
      <div className={styles.wide}>
        <FormField label="Tipo de licencia">
          {(field) => (
            <CatalogSelect
              {...field}
              catalog="license-types"
              value={value.licenseType}
              onChange={(option) => set('licenseType', option)}
              placeholder="Todos"
            />
          )}
        </FormField>
      </div>
      <FormField label="Categoría RAV 60">
        {(field) => (
          <Select
            {...field}
            value={value.rav60Category}
            onChange={(event) => set('rav60Category', event.target.value as Rav60Category | '')}
          >
            <option value="">Todas</option>
            {RAV60_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {RAV60_LABELS[category]}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      {statuses.length > 0 ? (
        <FormField label="Estado">
          {(field) => (
            <Select
              {...field}
              value={value.status}
              onChange={(event) => set('status', event.target.value as ReportStatus | '')}
            >
              <option value="">Todos</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      ) : null}
      <FormField label={`${range} desde`}>
        {(field) => <DateInput {...field} value={value.from} onChange={(event) => set('from', event.target.value)} />}
      </FormField>
      <FormField label={`${range} hasta`} error={rangeError}>
        {(field) => <DateInput {...field} value={value.to} onChange={(event) => set('to', event.target.value)} />}
      </FormField>
    </div>
  )
}
