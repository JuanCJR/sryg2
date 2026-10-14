import { DateInput, FormField, StatusBadge, type CredentialStatus } from '../../../design-system'
import styles from './LicenseSection.module.css'

export interface LicenseSectionProps {
  categoria: string
  numero: string
  estadoActual: CredentialStatus
  venceActualLabel: string
  nuevaFecha: string
  onNuevaFechaChange: (value: string) => void
  nuevaFechaError?: string
}

/** The LICENCIA section: read-only current record plus the editable new expiry. */
export function LicenseSection({
  categoria,
  numero,
  estadoActual,
  venceActualLabel,
  nuevaFecha,
  onNuevaFechaChange,
  nuevaFechaError,
}: LicenseSectionProps) {
  return (
    <div className={styles.grid}>
      <div className={styles.readonly}>
        <span className={styles.readonlyLabel}>Categoría</span>
        <span className={styles.readonlyValue}>{categoria}</span>
      </div>
      <div className={styles.readonly}>
        <span className={styles.readonlyLabel}>Número</span>
        <span className={styles.readonlyValueFigure}>{numero}</span>
      </div>
      <div className={styles.readonly}>
        <span className={styles.readonlyLabel}>Estado actual</span>
        <StatusBadge status={estadoActual} />
      </div>
      <div className={styles.readonly}>
        <span className={styles.readonlyLabel}>Vence actualmente</span>
        <span className={styles.readonlyValueFigure}>{venceActualLabel}</span>
      </div>
      <div className={styles.dateField}>
        <FormField
          label="Nueva fecha de vencimiento"
          required
          error={nuevaFechaError}
          hint="Vigencia sintética de demostración, pendiente de OD-06."
        >
          {(controlProps) => (
            <DateInput
              {...controlProps}
              value={nuevaFecha}
              onChange={(event) => onNuevaFechaChange(event.target.value)}
            />
          )}
        </FormField>
      </div>
    </div>
  )
}
