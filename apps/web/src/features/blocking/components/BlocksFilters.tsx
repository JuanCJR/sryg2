import { BLOCK_STATUSES, BLOCK_TYPES, type BlockStatus, type BlockType } from '@sryg/types'
import { FormField, Input, Select } from '../../../design-system'
import { BLOCK_TYPE_LABEL } from '../domain/block-view'
import styles from './BlocksFilters.module.css'

export interface BlocksFilterValues {
  /** '' = every status. */
  status: BlockStatus | ''
  type: BlockType | ''
  /** Person name or cédula. */
  person: string
}

export interface BlocksFiltersProps {
  values: BlocksFilterValues
  onChange: (values: BlocksFilterValues) => void
  disabled?: boolean
}

const STATUS_OPTION_LABEL: Record<BlockStatus, string> = { activo: 'Activos', resuelto: 'Resueltos' }

export function BlocksFilters({ values, onChange, disabled = false }: BlocksFiltersProps) {
  return (
    <div className={styles.filters} role="search">
      <FormField label="Estado">
        {(control) => (
          <Select
            {...control}
            disabled={disabled}
            value={values.status}
            onChange={(event) => onChange({ ...values, status: event.target.value as BlockStatus | '' })}
          >
            {BLOCK_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_OPTION_LABEL[value]}
              </option>
            ))}
            <option value="">Todos</option>
          </Select>
        )}
      </FormField>
      <FormField label="Tipo">
        {(control) => (
          <Select
            {...control}
            disabled={disabled}
            value={values.type}
            onChange={(event) => onChange({ ...values, type: event.target.value as BlockType | '' })}
          >
            <option value="">Todos</option>
            {BLOCK_TYPES.map((value) => (
              <option key={value} value={value}>
                {BLOCK_TYPE_LABEL[value]}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <FormField label="Persona">
        {(control) => (
          <Input
            {...control}
            type="search"
            autoComplete="off"
            placeholder="Nombre o cédula"
            disabled={disabled}
            value={values.person}
            onChange={(event) => onChange({ ...values, person: event.target.value })}
          />
        )}
      </FormField>
    </div>
  )
}
