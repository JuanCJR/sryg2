import { BLOCK_STATUSES, BLOCK_TYPES, type BlockStatus, type BlockType } from '@sryg/types'
import { CheckboxFilter, FilterPanel, FilterSection, Input } from '../../../design-system'
import { BLOCK_TYPE_LABEL } from '../domain/block-view'

export interface BlocksFilterValues {
  /** Empty = every status. */
  status: BlockStatus[]
  /** Empty = every type. */
  type: BlockType[]
  /** Person name or cédula. */
  person: string
}

const EMPTY_BLOCKS_FILTERS: BlocksFilterValues = { status: [], type: [], person: '' }

export interface BlocksFiltersProps {
  values: BlocksFilterValues
  onChange: (values: BlocksFilterValues) => void
  disabled?: boolean
}

const STATUS_OPTIONS = BLOCK_STATUSES.map((value) => ({
  value,
  label: value === 'activo' ? 'Activos' : 'Resueltos',
}))
const TYPE_OPTIONS = BLOCK_TYPES.map((value) => ({ value, label: BLOCK_TYPE_LABEL[value] }))

/** How many filters narrow the list: each checked value plus the person text. */
function activeBlocksFilterCount(values: BlocksFilterValues): number {
  return values.status.length + values.type.length + (values.person.trim() ? 1 : 0)
}

/** Left filter column of /bloqueos: status and type checkbox groups, and the person search. */
export function BlocksFilters({ values, onChange, disabled = false }: BlocksFiltersProps) {
  const personActive = values.person.trim() ? 1 : 0

  return (
    <FilterPanel
      aria-label="Filtros de bloqueos"
      activeCount={activeBlocksFilterCount(values)}
      onClearAll={disabled ? undefined : () => onChange(EMPTY_BLOCKS_FILTERS)}
    >
      <CheckboxFilter
        title="Estado"
        options={STATUS_OPTIONS}
        value={values.status}
        disabled={disabled}
        onChange={(status) => onChange({ ...values, status })}
      />
      <CheckboxFilter
        title="Tipo"
        options={TYPE_OPTIONS}
        value={values.type}
        disabled={disabled}
        onChange={(type) => onChange({ ...values, type })}
      />
      <FilterSection
        title="Persona"
        activeCount={personActive}
        onClear={disabled ? undefined : () => onChange({ ...values, person: '' })}
      >
        <Input
          type="search"
          autoComplete="off"
          aria-label="Persona"
          placeholder="Nombre o cédula"
          disabled={disabled}
          value={values.person}
          onChange={(event) => onChange({ ...values, person: event.target.value })}
        />
      </FilterSection>
    </FilterPanel>
  )
}
