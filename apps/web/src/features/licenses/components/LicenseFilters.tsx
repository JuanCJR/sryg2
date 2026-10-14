import type { CatalogOption } from '@sryg/types'
import { DateInput, FormField, Input } from '../../../design-system'
import { CatalogSelect } from '../../catalogs/CatalogSelect'
import styles from './LicenseFilters.module.css'

export interface LicenseFilterValues {
  solicitante: string
  numero: string
  tipo: CatalogOption | null
  venceDesde: string
  venceHasta: string
}

export interface LicenseFiltersProps {
  values: LicenseFilterValues
  onChange: (patch: Partial<LicenseFilterValues>) => void
  disabled?: boolean
}

/** The license query's filters, as in SLYM: applicant, number, type and expiry range. */
export function LicenseFilters({ values, onChange, disabled = false }: LicenseFiltersProps) {
  return (
    <div className={styles.grid} role="search" aria-label="Filtros de licencias">
      <FormField label="Solicitante">
        {(controlProps) => (
          <Input
            {...controlProps}
            type="search"
            placeholder="Nombre o cédula…"
            disabled={disabled}
            value={values.solicitante}
            onChange={(event) => onChange({ solicitante: event.target.value })}
          />
        )}
      </FormField>
      <FormField label="Número">
        {(controlProps) => (
          <Input
            {...controlProps}
            mono
            disabled={disabled}
            value={values.numero}
            onChange={(event) => onChange({ numero: event.target.value })}
          />
        )}
      </FormField>
      <FormField label="Tipo de licencia">
        {(controlProps) => (
          <CatalogSelect
            {...controlProps}
            catalog="license-types"
            placeholder="Todos los tipos"
            disabled={disabled}
            value={values.tipo}
            onChange={(tipo) => onChange({ tipo })}
          />
        )}
      </FormField>
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
  )
}
