import { ConditionTable, type ConditionRow } from '../../../app/expediente/ConditionTable'
import styles from '../../../app/expediente/ConditionTable.module.css'

export interface HabilitacionesPanelProps {
  groupLabel: string
  rows: ConditionRow[]
  nearExpiryDays: number
  highlightedId?: string | null
  /** Changes on every warning selection (even re-selecting the same row) to restart the sweep. */
  highlightNonce?: number
}

export function HabilitacionesPanel({
  groupLabel,
  rows,
  nearExpiryDays,
  highlightedId,
  highlightNonce,
}: HabilitacionesPanelProps) {
  return (
    <div>
      <ConditionTable
        caption="Habilitaciones"
        groupLabel={groupLabel}
        rows={rows}
        hideNumero
        highlightedId={highlightedId}
        highlightNonce={highlightNonce}
      />
      <p className={styles.threshold}>
        Umbral de aviso: {nearExpiryDays} días (parámetro de demostración, pendiente de INAC).
      </p>
    </div>
  )
}
