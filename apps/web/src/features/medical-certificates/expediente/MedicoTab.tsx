import { Stethoscope } from 'lucide-react'
import { Notice } from '../../../design-system'
import { ComingSoonButton, ComingSoonPanel } from '../../../app/expediente/ComingSoon'
import { useRole } from '../../../app/role/useRole'
import styles from '../components/MedicoPanel.module.css'

/** Médico page key (RAV 67, administrative data only: BR-05, D8). W1-6 implements it. */
export function MedicoTab() {
  const { can } = useRole()
  return (
    <div className={styles.wrap}>
      <Notice tone="info" title="Solo datos administrativos">
        SRYG no registra diagnósticos, antecedentes ni historia clínica. Solo clase, fechas y restricciones
        operacionales generales.
      </Notice>
      {can('medical_certificates', 'write') ? (
        <div className={styles.toolbar}>
          <ComingSoonButton variant="secondary" size="sm" icon={Stethoscope}>
            Registrar o renovar certificado
          </ComingSoonButton>
        </div>
      ) : null}
      <ComingSoonPanel
        description="Los certificados médicos de la persona."
        plannedChange="W1-6 feat/medical-certificates"
      />
    </div>
  )
}
