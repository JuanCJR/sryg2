import type { XlsxSheet } from '../../common/spreadsheet/xlsx'
import type { AuditTrailEntry } from '../dtos/audit-trail.dto'

export const AUDIT_SHEET_HEADER = [
  'Fecha (UTC)',
  'Actor',
  'Correo',
  'Acción',
  'Entidad',
  'ID de entidad',
  'Cambios',
] as const

/**
 * The trail as an Excel worksheet: one row per entry, newest first as the reader returns them.
 * Dates are ISO 8601 in UTC; the changes stay as JSON so nothing is lost.
 */
export function toAuditSheet(entries: readonly AuditTrailEntry[], generatedAt: Date): XlsxSheet {
  return {
    name: 'Auditoría',
    title: 'Registro de auditoría',
    details: [
      `SRYG · INAC Maracay — Generado: ${generatedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
      `Registros: ${entries.length}`,
    ],
    columns: AUDIT_SHEET_HEADER.map((header) => ({ header, width: header === 'Cambios' ? 60 : undefined })),
    rows: entries.map((entry) => [
      entry.occurredAt.toISOString(),
      entry.actor?.fullName ?? '',
      entry.actor?.email ?? '',
      entry.action,
      entry.entity,
      entry.entityId ?? '',
      entry.changes === null ? '' : JSON.stringify(entry.changes),
    ]),
  }
}
