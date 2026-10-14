import { ConditionTable, type ConditionRow } from './ConditionTable'
import styles from './ConditionTable.module.css'

export interface LicenciasPanelProps {
  rows: ConditionRow[]
  nearExpiryDays: number
  highlightedId?: string | null
  /** Changes on every warning selection (even re-selecting the same row) to restart the sweep. */
  highlightNonce?: number
}

export function LicenciasPanel({ rows, nearExpiryDays, highlightedId, highlightNonce }: LicenciasPanelProps) {
  return (
    <div>
      <ConditionTable caption="Licencias" rows={rows} highlightedId={highlightedId} highlightNonce={highlightNonce} />
      <p className={styles.threshold}>
        Umbral de aviso: {nearExpiryDays} días (parámetro de demostración, pendiente de INAC).
      </p>
    </div>
  )
}
