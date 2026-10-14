import type { AuditEntryDto, AuditFilter } from '@sryg/types'
import { ACTION_LABELS, entityLabel } from './labels'
import { formatDateTime } from './format'
import type { AuditFilterErrors, AuditFilterValues, AuditRow } from './types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Fields the change touched, from its before/after snapshots ("—" when it carries none). */
function changedFields(changes: AuditEntryDto['changes']): string {
  const keys = new Set<string>()
  for (const side of [changes?.before, changes?.after]) {
    if (side && typeof side === 'object' && !Array.isArray(side)) Object.keys(side).forEach((key) => keys.add(key))
  }
  return keys.size ? [...keys].join(', ') : '—'
}

export function toAuditRow(entry: AuditEntryDto): AuditRow {
  return {
    id: entry.id,
    fecha: formatDateTime(entry.occurredAt),
    actor: entry.actor?.fullName ?? 'Sistema',
    accion: ACTION_LABELS[entry.action],
    entidad: entityLabel(entry.entity),
    detalle: changedFields(entry.changes),
  }
}

export function validateFilters({ entityId, from, to }: AuditFilterValues): AuditFilterErrors {
  const errors: AuditFilterErrors = {}
  if (entityId.trim() && !UUID.test(entityId.trim())) errors.entityId = 'Escriba el identificador completo (UUID).'
  if (from && to && from > to) errors.range = 'La fecha inicial no puede ser posterior a la final.'
  return errors
}

/** The filters as the API reads them: blank fields left out. */
export function toAuditFilter(values: AuditFilterValues): AuditFilter {
  const filter: AuditFilter = {}
  const actor = values.actor.trim()
  const entityId = values.entityId.trim()
  if (actor) filter.actor = actor
  if (values.action) filter.action = values.action
  if (values.entity) filter.entity = values.entity
  if (entityId) filter.entityId = entityId
  if (values.from) filter.from = values.from
  if (values.to) filter.to = values.to
  return filter
}

export const formatCount = (total: number) =>
  `${total.toLocaleString('es-VE')} ${total === 1 ? 'registro' : 'registros'}`
