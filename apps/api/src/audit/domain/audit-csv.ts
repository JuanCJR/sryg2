import type { AuditTrailEntry } from './audit-trail'

export const AUDIT_CSV_HEADER = ['fecha', 'actor', 'correo', 'accion', 'entidad', 'id_entidad', 'cambios'] as const

// A spreadsheet runs a cell that starts with one of these as a formula (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/

function cell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/**
 * The trail as RFC 4180 CSV (CRLF line breaks, quoted fields), preceded by a UTF-8 BOM so
 * spreadsheet programs read the accents correctly. Dates are ISO 8601 in UTC.
 */
export function toAuditCsv(entries: readonly AuditTrailEntry[]): string {
  const rows = entries.map((entry) => [
    entry.occurredAt.toISOString(),
    entry.actor?.fullName ?? '',
    entry.actor?.email ?? '',
    entry.action,
    entry.entity,
    entry.entityId ?? '',
    entry.changes === null ? '' : JSON.stringify(entry.changes),
  ])
  return `\uFEFF${[[...AUDIT_CSV_HEADER], ...rows].map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`
}
