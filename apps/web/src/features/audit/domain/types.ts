import type { AuditAction } from '@sryg/types'

/** The viewer's filters as the user edits them (blank = no filter). */
export interface AuditFilterValues {
  actor: string
  /** Checked actions; none checked = every action. */
  action: AuditAction[]
  /** Checked entities (table names); none checked = every entity. */
  entity: string[]
  entityId: string
  from: string
  to: string
}

export const EMPTY_FILTERS: AuditFilterValues = { actor: '', action: [], entity: [], entityId: '', from: '', to: '' }

/** Problems that keep the filters from being sent; each one is shown next to its field. */
export interface AuditFilterErrors {
  entityId?: string
  range?: string
}

/** One row of the audit table, ready to print. */
export interface AuditRow {
  id: number
  /** The entry's number in the trail ("N.º 2"), the table's ID column. */
  numero: string
  fecha: string
  actor: string
  accion: string
  entidad: string
  detalle: string
}
