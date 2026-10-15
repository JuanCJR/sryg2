import { ALERT_AREAS, CREDENTIAL_KINDS } from '@sryg/types'
import { FormField, Select } from '../../../design-system'
import type { Acknowledgement, AlertFilterValues } from '../domain/alert-view'
import { ACKNOWLEDGEMENT_LABELS, AREA_LABELS, CREDENTIAL_KIND_LABELS } from '../domain/labels'
import styles from './AlertFilters.module.css'

export interface AlertFiltersProps {
  values: AlertFilterValues
  onChange: <K extends keyof AlertFilterValues>(key: K, value: AlertFilterValues[K]) => void
}

const ACKNOWLEDGEMENTS = Object.keys(ACKNOWLEDGEMENT_LABELS) as Acknowledgement[]

/** Filters of the alert list: credential type, area (D24) and acknowledgement (ALR-06). */
export function AlertFilters({ values, onChange }: AlertFiltersProps) {
  return (
    <div className={styles.bar}>
      <FormField label="Tipo de credencial">
        {(field) => (
          <Select
            {...field}
            value={values.credentialKind}
            onChange={(event) => onChange('credentialKind', event.target.value as AlertFilterValues['credentialKind'])}
          >
            <option value="">Todas</option>
            {CREDENTIAL_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {CREDENTIAL_KIND_LABELS[kind]}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <FormField label="Área">
        {(field) => (
          <Select
            {...field}
            value={values.area}
            onChange={(event) => onChange('area', event.target.value as AlertFilterValues['area'])}
          >
            <option value="">Todas</option>
            {ALERT_AREAS.map((area) => (
              <option key={area} value={area}>
                {AREA_LABELS[area]}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <FormField label="Reconocimiento">
        {(field) => (
          <Select
            {...field}
            value={values.acknowledgement}
            onChange={(event) => onChange('acknowledgement', event.target.value as Acknowledgement)}
          >
            {ACKNOWLEDGEMENTS.map((value) => (
              <option key={value} value={value}>
                {ACKNOWLEDGEMENT_LABELS[value]}
              </option>
            ))}
          </Select>
        )}
      </FormField>
    </div>
  )
}
