import type { AuditRow } from '../utils/types'
import styles from './AuditTable.module.css'

export interface AuditTableProps {
  /** Accessible name of the table (e.g. "Registro de auditoría"). */
  label: string
  rows: AuditRow[]
}

/**
 * The trail, one entry per row, in the list convention's order: entry number (ID), actor
 * (Persona), action (Tipo), entity and the fields the change touched (Detalle), then the date.
 */
export function AuditTable({ label, rows }: AuditTableProps) {
  return (
    <div className={styles.table} role="table" aria-label={label}>
      <div className={styles.headerRow} role="row">
        <span className={styles.headerCell} role="columnheader">
          N.º
        </span>
        <span className={styles.headerCell} role="columnheader">
          Actor
        </span>
        <span className={styles.headerCell} role="columnheader">
          Acción
        </span>
        <span className={styles.headerCell} role="columnheader">
          Entidad
        </span>
        <span className={styles.headerCell} role="columnheader">
          Campos
        </span>
        <span className={styles.headerCell} role="columnheader">
          Fecha y hora (UTC)
        </span>
      </div>
      {rows.map((row) => (
        <div key={row.id} className={styles.row} role="row">
          <span role="cell" className={styles.numero}>
            {row.numero}
          </span>
          <span role="cell" className={styles.cell}>
            {row.actor}
          </span>
          <span role="cell" className={styles.cell}>
            {row.accion}
          </span>
          <span role="cell" className={styles.cell}>
            {row.entidad}
          </span>
          <span role="cell" className={styles.detalle}>
            {row.detalle}
          </span>
          <span role="cell" className={styles.fecha}>
            {row.fecha}
          </span>
        </div>
      ))}
    </div>
  )
}
