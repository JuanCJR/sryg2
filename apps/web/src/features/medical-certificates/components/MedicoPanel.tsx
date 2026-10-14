import type { ReactNode } from 'react'
import { Stethoscope } from 'lucide-react'
import { PENDING_INAC_LABEL } from '@sryg/types'
import { Button, Notice } from '../../../design-system'
import { ConditionTable, type ConditionRow } from '../../../app/expediente/ConditionTable'
import { NO_CLINICAL_DATA_TITLE } from '../domain/labels'
import styles from './MedicoPanel.module.css'
import tableStyles from '../../../app/expediente/ConditionTable.module.css'

export type MedicoPanelState =
  | { status: 'loading' }
  | { status: 'error'; onRetry: () => void }
  | {
      status: 'ready'
      rows: ConditionRow[]
      thresholdDays: number
      thresholdIsPlaceholder: boolean
      hasActiveBlock: boolean
      /** Per-certificate history (MED-07), only for whoever reads the audit. */
      history?: ReactNode
    }

export interface MedicoPanelProps {
  state: MedicoPanelState
  canWriteMedical: boolean
  onRegisterOrRenew: () => void
}

/** The Médico page key: administrative data only (BR-05, D8). */
export function MedicoPanel({ state, canWriteMedical, onRegisterOrRenew }: MedicoPanelProps) {
  return (
    <div className={styles.wrap}>
      <Notice tone="info" title={NO_CLINICAL_DATA_TITLE}>
        Solo se registran la clase RAV 67, el número, las fechas, las observaciones del catálogo y las restricciones
        operacionales generales. Nunca diagnósticos, antecedentes ni historia clínica.
      </Notice>
      {state.status === 'ready' && state.hasActiveBlock ? (
        <Notice tone="caution" title="Certificado médico bloqueado">
          La persona tiene un bloqueo activo: no se puede registrar ni renovar el certificado hasta que se resuelva.
        </Notice>
      ) : null}
      {canWriteMedical ? (
        <div className={styles.toolbar}>
          <Button variant="secondary" size="sm" icon={Stethoscope} onClick={onRegisterOrRenew}>
            Registrar o renovar certificado
          </Button>
        </div>
      ) : null}
      {state.status === 'loading' ? (
        <p role="status" className={styles.loading}>
          Cargando certificados médicos…
        </p>
      ) : null}
      {state.status === 'error' ? (
        <Notice
          tone="warning"
          title="No se pudieron cargar los certificados médicos"
          action={
            <Button variant="secondary" size="sm" onClick={state.onRetry}>
              Reintentar
            </Button>
          }
        >
          El servidor no respondió. Revise la conexión a la red local e intente de nuevo.
        </Notice>
      ) : null}
      {state.status === 'ready' ? (
        <>
          <ConditionTable
            caption="Certificados médicos"
            rows={state.rows}
            hideNumero
            restriccionesHeader="Observaciones y restricciones"
            emptyLabel="Sin certificados médicos registrados."
          />
          <p className={tableStyles.threshold}>
            Umbral de aviso: {state.thresholdDays} días
            {state.thresholdIsPlaceholder ? ` · ${PENDING_INAC_LABEL}` : ''}
          </p>
          {state.history}
        </>
      ) : null}
    </div>
  )
}
