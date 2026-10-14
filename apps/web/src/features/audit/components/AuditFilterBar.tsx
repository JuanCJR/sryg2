import type { ReactNode } from 'react'
import { AUDIT_ACTIONS, type AuditAction } from '@sryg/types'
import { DateInput, FormField, Input, Select } from '../../../design-system'
import { ACTION_LABELS, ENTITY_LABELS } from '../domain/labels'
import type { AuditFilterErrors, AuditFilterValues } from '../domain/types'
import styles from './AuditFilterBar.module.css'

export interface AuditFilterBarProps {
  values: AuditFilterValues
  errors: AuditFilterErrors
  onChange: <K extends keyof AuditFilterValues>(key: K, value: AuditFilterValues[K]) => void
  /** The entity-id field; the Historial tab hides it, since the person already narrows the trail. */
  showEntityId?: boolean
  /** Trailing control (the export button on the Auditoría page). */
  action?: ReactNode
}

/** Server-side filters of the trail (REP-04): actor, action, entity, entity id and a date range. */
export function AuditFilterBar({ values, errors, onChange, showEntityId = true, action }: AuditFilterBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.fields}>
        <FormField label="Actor">
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
        <FormField label="Acción">
          {(props) => (
            <Select
              {...props}
              value={values.action}
              onChange={(event) => onChange('action', event.target.value as AuditAction | '')}
            >
              <option value="">Todas</option>
              {AUDIT_ACTIONS.map((option) => (
                <option key={option} value={option}>
                  {ACTION_LABELS[option]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="Entidad">
          {(props) => (
            <Select {...props} value={values.entity} onChange={(event) => onChange('entity', event.target.value)}>
              <option value="">Todas</option>
              {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        {showEntityId ? (
          <FormField label="ID de entidad" error={errors.entityId}>
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
        ) : null}
        <FormField label="Desde" error={errors.range}>
          {(props) => (
            <DateInput {...props} value={values.from} onChange={(event) => onChange('from', event.target.value)} />
          )}
        </FormField>
        <FormField label="Hasta">
          {(props) => (
            <DateInput
              {...props}
              aria-invalid={Boolean(errors.range)}
              value={values.to}
              onChange={(event) => onChange('to', event.target.value)}
            />
          )}
        </FormField>
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  )
}
