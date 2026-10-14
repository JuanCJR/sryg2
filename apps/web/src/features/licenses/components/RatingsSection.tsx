import { Checkbox, DateInput, FormField, StatusBadge, type CredentialStatus } from '../../../design-system'
import type { ExistingRatingAction } from '../domain/emission'
import styles from './RatingsSection.module.css'

export interface RatingRowView {
  id: string
  nombre: string
  estadoActual: CredentialStatus
  venceActualLabel: string
  action: ExistingRatingAction
  nuevaFechaError?: string
}

export interface RatingsSectionProps {
  rows: RatingRowView[]
  onToggleRenew: (id: string) => void
  onToggleRemove: (id: string) => void
  onDateChange: (id: string, value: string) => void
}

/**
 * The ratings the license already has: one hairline-separated row per rating, each leading with
 * its lamp and two controls labelled with the rating's own name — renew it (with its new expiry)
 * or remove it. Toggling either updates the summary rail in place (the signature interaction).
 */
export function RatingsSection({ rows, onToggleRenew, onToggleRemove, onDateChange }: RatingsSectionProps) {
  if (rows.length === 0) return <p className={styles.empty}>La licencia no tiene habilitaciones de este tipo.</p>
  return (
    <div className={styles.list}>
      {rows.map((row) => {
        const renewId = `rating-renew-${row.id}`
        const removeId = `rating-remove-${row.id}`
        return (
          <div key={row.id} className={styles.row}>
            <div className={styles.summary}>
              <StatusBadge status={row.estadoActual} />
              <span className={styles.nombre}>{row.nombre}</span>
              <span className={styles.vence}>Vence actualmente: {row.venceActualLabel}</span>
            </div>
            <div className={styles.choices}>
              <span className={styles.choice}>
                <Checkbox
                  id={renewId}
                  aria-label={`Renovar ${row.nombre}`}
                  checked={row.action.kind === 'renew'}
                  onChange={() => onToggleRenew(row.id)}
                />
                <label htmlFor={renewId} aria-hidden="true">
                  Renovar
                </label>
              </span>
              <span className={styles.choice}>
                <Checkbox
                  id={removeId}
                  aria-label={`Quitar ${row.nombre}`}
                  checked={row.action.kind === 'remove'}
                  onChange={() => onToggleRemove(row.id)}
                />
                <label htmlFor={removeId} aria-hidden="true">
                  Quitar
                </label>
              </span>
            </div>
            {row.action.kind === 'renew' ? (
              <div className={styles.dateField}>
                <FormField label="Nueva fecha de vencimiento" required error={row.nuevaFechaError}>
                  {(controlProps) => (
                    <DateInput
                      {...controlProps}
                      aria-label={`Nueva fecha de vencimiento de ${row.nombre}`}
                      value={row.action.kind === 'renew' ? row.action.expiryDate : ''}
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
