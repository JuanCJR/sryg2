import { Stethoscope } from 'lucide-react'
import { Button, Notice } from '../../../design-system'
import { ConditionTable, type ConditionRow } from './ConditionTable'
import styles from './MedicoPanel.module.css'
import tableStyles from './ConditionTable.module.css'

export interface MedicoPanelProps {
  rows: ConditionRow[]
  nearExpiryDays: number
  canWriteMedical: boolean
  onRegisterOrRenew: () => void
  highlightedId?: string | null
  /** Changes on every warning selection (even re-selecting the same row) to restart the sweep. */
  highlightNonce?: number
}

export function MedicoPanel({
  rows,
  nearExpiryDays,
  canWriteMedical,
  onRegisterOrRenew,
  highlightedId,
  highlightNonce,
}: MedicoPanelProps) {
  return (
    <div className={styles.wrap}>
      <Notice tone="info" title="Solo datos administrativos">
        SRYG no registra diagnósticos, antecedentes ni historia clínica. Solo clase, fechas y restricciones
        operacionales generales.
      </Notice>
      {canWriteMedical ? (
        <div className={styles.toolbar}>
          <Button variant="secondary" size="sm" icon={Stethoscope} onClick={onRegisterOrRenew}>
            Registrar o renovar certificado
          </Button>
        </div>
      ) : null}
      <ConditionTable
        caption="Certificado médico"
        rows={rows}
        hideNumero
        restriccionesHeader="Restricciones"
        highlightedId={highlightedId}
        highlightNonce={highlightNonce}
      />
      <p className={tableStyles.threshold}>
        Umbral de aviso: {nearExpiryDays} días (parámetro de demostración, pendiente de INAC).
      </p>
    </div>
  )
}
