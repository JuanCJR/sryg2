import { Checkbox, DateInput, FormField, StatusBadge, type CredentialStatus } from '../../../design-system'
import styles from './RatingsSection.module.css'

export interface RatingRowView {
  id: string
  nombre: string
  estadoActual: CredentialStatus
  venceActualLabel: string
  included: boolean
  nuevaFecha: string
  nuevaFechaError?: string
}

export interface RatingsSectionProps {
  rows: RatingRowView[]
  onToggle: (id: string) => void
  onDateChange: (id: string, value: string) => void
}

/**
 * The HABILITACIONES section: one hairline-separated row per rating, each leading with its lamp
 * and an include control whose visible label is the rating's own name — the signature
 * interaction (toggling updates the summary rail in place).
 */
export function RatingsSection({ rows, onToggle, onDateChange }: RatingsSectionProps) {
  return (
    <div className={styles.list}>
      {rows.map((row) => {
        const checkboxId = `rating-include-${row.id}`
        return (
          <div key={row.id} className={styles.row}>
            <div className={styles.summary}>
              {/* Lamp and the include checkbox travel together as one unbreakable group, so a
                  narrow-width wrap never separates the checkbox from its lamp column. */}
              <div className={styles.statusGroup}>
                <StatusBadge status={row.estadoActual} />
                <Checkbox id={checkboxId} checked={row.included} onChange={() => onToggle(row.id)} />
              </div>
              <label htmlFor={checkboxId} className={styles.nombre}>
                {row.nombre}
              </label>
              <span className={styles.vence}>Vence actualmente: {row.venceActualLabel}</span>
            </div>
            {row.included ? (
              <div className={styles.dateField}>
                <FormField
                  label="Nueva fecha de vencimiento"
                  required
                  error={row.nuevaFechaError}
                  hint="Vigencia sintética de demostración, pendiente de OD-06."
                >
                  {(controlProps) => (
                    <DateInput
                      {...controlProps}
                      aria-label={`Nueva fecha de vencimiento de ${row.nombre}`}
                      value={row.nuevaFecha}
                      onChange={(event) => onDateChange(row.id, event.target.value)}
                    />
                  )}
                </FormField>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
