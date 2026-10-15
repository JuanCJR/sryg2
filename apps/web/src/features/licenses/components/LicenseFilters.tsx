import { DateInput, FilterPanel, FilterSection, FormField, Input } from '../../../design-system'
import { CatalogSelect } from '../../catalogs/CatalogSelect'
import { activeLicenseFilterCount, EMPTY_LICENSE_FILTERS, type LicenseFilterValues } from '../domain/filters'
import styles from './LicenseFilters.module.css'

export type { LicenseFilterValues } from '../domain/filters'

export interface LicenseFiltersProps {
  values: LicenseFilterValues
  onChange: (patch: Partial<LicenseFilterValues>) => void
  disabled?: boolean
}

/** Left filter column of the license query, as in SLYM: applicant, number, type and expiry range. */
export function LicenseFilters({ values, onChange, disabled = false }: LicenseFiltersProps) {
  const clear = (patch: Partial<LicenseFilterValues>) => (disabled ? undefined : () => onChange(patch))
  const rangeCount = (values.venceDesde ? 1 : 0) + (values.venceHasta ? 1 : 0)

  return (
    <FilterPanel
      aria-label="Filtros de licencias"
      activeCount={activeLicenseFilterCount(values)}
      onClearAll={clear(EMPTY_LICENSE_FILTERS)}
    >
      <FilterSection
        title="Solicitante"
        activeCount={values.solicitante.trim() ? 1 : 0}
        onClear={clear({ solicitante: '' })}
      >
        <Input
          type="search"
          autoComplete="off"
          aria-label="Solicitante"
          placeholder="Nombre o cédula…"
          disabled={disabled}
          value={values.solicitante}
          onChange={(event) => onChange({ solicitante: event.target.value })}
        />
      </FilterSection>
      <FilterSection title="Número" activeCount={values.numero.trim() ? 1 : 0} onClear={clear({ numero: '' })}>
        <Input
          mono
          autoComplete="off"
          aria-label="Número"
          disabled={disabled}
          value={values.numero}
          onChange={(event) => onChange({ numero: event.target.value })}
        />
      </FilterSection>
      <FilterSection title="Tipo de licencia" activeCount={values.tipo ? 1 : 0} onClear={clear({ tipo: null })}>
        <CatalogSelect
          aria-label="Tipo de licencia"
          catalog="license-types"
          placeholder="Todos los tipos"
          disabled={disabled}
          value={values.tipo}
          onChange={(tipo) => onChange({ tipo })}
        />
      </FilterSection>
      <FilterSection title="Vencimiento" activeCount={rangeCount} onClear={clear({ venceDesde: '', venceHasta: '' })}>
        <div className={styles.range}>
          <FormField label="Vence desde">
            {(controlProps) => (
              <DateInput
                {...controlProps}
                disabled={disabled}
                value={values.venceDesde}
                onChange={(event) => onChange({ venceDesde: event.target.value })}
              />
            )}
          </FormField>
          <FormField label="Vence hasta">
            {(controlProps) => (
              <DateInput
                {...controlProps}
                disabled={disabled}
                value={values.venceHasta}
                onChange={(event) => onChange({ venceHasta: event.target.value })}
              />
            )}
          </FormField>
        </div>
      </FilterSection>
    </FilterPanel>
  )
}
