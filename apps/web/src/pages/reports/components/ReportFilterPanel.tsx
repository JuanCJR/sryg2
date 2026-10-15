import { RAV60_CATEGORIES, type Rav60Category, type ReportId, type ReportStatus } from '@sryg/types'
import { CheckboxFilter, DateInput, FilterPanel, FilterSection, FormField, Input } from '../../../common/components'
import { CatalogSelect } from '../../../common/components/CatalogSelect/CatalogSelect'
import { countActiveFilters, EMPTY_FILTERS, type ReportFilterValues } from '../utils/report-filters'
import { DATE_RANGE_LABELS, RAV60_LABELS, STATUS_FILTERS, STATUS_LABELS } from '../utils/report-view'

export interface ReportFilterPanelProps {
  report: ReportId
  value: ReportFilterValues
  onChange: (value: ReportFilterValues) => void
  /** Shown under the "Hasta" field when the range is inverted. */
  rangeError?: string
}

const RAV60_OPTIONS = RAV60_CATEGORIES.map((category) => ({ value: category, label: RAV60_LABELS[category] }))

/**
 * The D10 filters as the left filter column: holder, license type, RAV 60 category and status
 * (checkbox groups — none checked means all; no status for active blocks) and the date range.
 */
export function ReportFilterPanel({ report, value, onChange, rangeError }: ReportFilterPanelProps) {
  const set = <K extends keyof ReportFilterValues>(key: K, next: ReportFilterValues[K]) =>
    onChange({ ...value, [key]: next })
  const statuses = STATUS_FILTERS[report]
  const statusOptions = statuses.map((status) => ({ value: status, label: STATUS_LABELS[status] }))
  const dateCount = [value.from, value.to].filter(Boolean).length

  return (
    <FilterPanel
      aria-label="Filtros del reporte"
      activeCount={countActiveFilters(value, report)}
      onClearAll={() => onChange(EMPTY_FILTERS)}
    >
      <FilterSection title="Titular" activeCount={value.q.trim() ? 1 : 0} onClear={() => set('q', '')}>
        <FormField label="Nombre o cédula">
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
      </FilterSection>
      <FilterSection
        title="Tipo de licencia"
        activeCount={value.licenseType ? 1 : 0}
        onClear={() => set('licenseType', null)}
      >
        <CatalogSelect
          aria-label="Tipo de licencia"
          catalog="license-types"
          value={value.licenseType}
          onChange={(option) => set('licenseType', option)}
          placeholder="Todos"
        />
      </FilterSection>
      <CheckboxFilter<Rav60Category>
        title="Categoría RAV 60"
        options={RAV60_OPTIONS}
        value={value.rav60Category}
        onChange={(next) => set('rav60Category', next)}
      />
      {statusOptions.length > 0 ? (
        <CheckboxFilter<ReportStatus>
          title="Estado"
          options={statusOptions}
          value={value.status.filter((status) => statuses.includes(status))}
          onChange={(next) => set('status', next)}
        />
      ) : null}
      <FilterSection
        title={DATE_RANGE_LABELS[report]}
        activeCount={dateCount}
        onClear={() => onChange({ ...value, from: '', to: '' })}
      >
        <FormField label="Desde">
          {(field) => (
            <DateInput
              {...field}
              max={value.to || undefined}
              value={value.from}
              onChange={(event) => set('from', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Hasta" error={rangeError}>
          {(field) => (
            <DateInput
              {...field}
              min={value.from || undefined}
              value={value.to}
              onChange={(event) => set('to', event.target.value)}
            />
          )}
        </FormField>
      </FilterSection>
    </FilterPanel>
  )
}
