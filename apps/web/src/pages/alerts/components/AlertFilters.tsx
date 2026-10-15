import { ALERT_AREAS, CREDENTIAL_KINDS } from '@sryg/types'
import { CheckboxFilter, FilterPanel } from '../../../common/components'
import { ACKNOWLEDGEMENTS, type AlertFilterValues } from '../utils/alert-view'
import { ACKNOWLEDGEMENT_LABELS, AREA_LABELS, CREDENTIAL_KIND_LABELS } from '../utils/labels'

export interface AlertFiltersProps {
  values: AlertFilterValues
  onChange: <K extends keyof AlertFilterValues>(key: K, value: AlertFilterValues[K]) => void
  onClearAll: () => void
}

const CREDENTIAL_OPTIONS = CREDENTIAL_KINDS.map((value) => ({ value, label: CREDENTIAL_KIND_LABELS[value] }))
const AREA_OPTIONS = ALERT_AREAS.map((value) => ({ value, label: AREA_LABELS[value] }))
const ACKNOWLEDGEMENT_OPTIONS = ACKNOWLEDGEMENTS.map((value) => ({ value, label: ACKNOWLEDGEMENT_LABELS[value] }))

/** Filters of the alert list: credential type, area (D24) and acknowledgement (ALR-06), as checkbox groups. */
export function AlertFilters({ values, onChange, onClearAll }: AlertFiltersProps) {
  const activeCount = values.credentialKind.length + values.area.length + values.acknowledgement.length

  return (
    <FilterPanel aria-label="Filtros de alertas" activeCount={activeCount} onClearAll={onClearAll}>
      <CheckboxFilter
        title="Tipo de credencial"
        options={CREDENTIAL_OPTIONS}
        value={values.credentialKind}
        onChange={(next) => onChange('credentialKind', next)}
      />
      <CheckboxFilter
        title="Área"
        options={AREA_OPTIONS}
        value={values.area}
        onChange={(next) => onChange('area', next)}
      />
      <CheckboxFilter
        title="Reconocimiento"
        options={ACKNOWLEDGEMENT_OPTIONS}
        value={values.acknowledgement}
        onChange={(next) => onChange('acknowledgement', next)}
      />
    </FilterPanel>
  )
}
