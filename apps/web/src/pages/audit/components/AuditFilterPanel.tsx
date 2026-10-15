import { AUDIT_ACTIONS, type AuditAction } from '@sryg/types'
import { CheckboxFilter, DateInput, FilterPanel, FilterSection, FormField, Input } from '../../../common/components'
import { countActiveFilters } from '../utils/audit-view'
import { ACTION_LABELS, ENTITY_LABELS } from '../utils/labels'
import type { AuditFilterErrors, AuditFilterValues } from '../utils/types'

export interface AuditFilterPanelProps {
  values: AuditFilterValues
  errors: AuditFilterErrors
  onChange: <K extends keyof AuditFilterValues>(key: K, value: AuditFilterValues[K]) => void
  onClearAll: () => void
  /** The entity-id field; the Historial tab hides it, since the person already narrows the trail. */
  showEntityId?: boolean
  /** Names the landmark (the page and the expediente tab each have their own). */
  'aria-label'?: string
}

const ACTION_OPTIONS = AUDIT_ACTIONS.map((value) => ({ value, label: ACTION_LABELS[value] }))
const ENTITY_OPTIONS = Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label }))

/**
 * Server-side filters of the trail (REP-04) as the left filter column: actor, action and entity
 * (checkbox groups — none checked means all), entity id and a date range.
 */
export function AuditFilterPanel({
  values,
  errors,
  onChange,
  onClearAll,
  showEntityId = true,
  'aria-label': ariaLabel = 'Filtros de auditoría',
}: AuditFilterPanelProps) {
  const dateCount = [values.from, values.to].filter(Boolean).length

  return (
    <FilterPanel aria-label={ariaLabel} activeCount={countActiveFilters(values)} onClearAll={onClearAll}>
      <FilterSection title="Actor" activeCount={values.actor.trim() ? 1 : 0} onClear={() => onChange('actor', '')}>
        <FormField label="Nombre o correo">
          {(props) => (
            <Input
              {...props}
              type="search"
              placeholder="Nombre o correo…"
              value={values.actor}
              onChange={(event) => onChange('actor', event.target.value)}
            />
          )}
        </FormField>
      </FilterSection>
      <CheckboxFilter<AuditAction>
        title="Acción"
        options={ACTION_OPTIONS}
        value={values.action}
        onChange={(next) => onChange('action', next)}
      />
      <CheckboxFilter
        title="Entidad"
        options={ENTITY_OPTIONS}
        value={values.entity}
        onChange={(next) => onChange('entity', next)}
      />
      {showEntityId ? (
        <FilterSection
          title="ID de entidad"
          activeCount={values.entityId.trim() ? 1 : 0}
          onClear={() => onChange('entityId', '')}
        >
          <FormField label="Identificador (UUID)" error={errors.entityId}>
            {(props) => (
              <Input
                {...props}
                mono
                spellCheck={false}
                placeholder="UUID"
                value={values.entityId}
                onChange={(event) => onChange('entityId', event.target.value)}
              />
            )}
          </FormField>
        </FilterSection>
      ) : null}
      <FilterSection
        title="Fecha"
        activeCount={dateCount}
        onClear={() => {
          onChange('from', '')
          onChange('to', '')
        }}
      >
        <FormField label="Desde" error={errors.range}>
          {(props) => (
            <DateInput
              {...props}
              max={values.to || undefined}
              value={values.from}
              onChange={(event) => onChange('from', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Hasta">
          {(props) => (
            <DateInput
              {...props}
              aria-invalid={Boolean(errors.range)}
              min={values.from || undefined}
              value={values.to}
              onChange={(event) => onChange('to', event.target.value)}
            />
          )}
        </FormField>
      </FilterSection>
    </FilterPanel>
  )
}
