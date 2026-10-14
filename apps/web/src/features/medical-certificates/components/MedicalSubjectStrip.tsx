import { Lamp, StatusBadge, type CredentialStatus } from '../../../design-system'
import styles from './MedicalSubjectStrip.module.css'

export type MedicalSubjectStripProps =
  { loading: true } | { loading?: false; cedula: string; nombre: string; status: CredentialStatus | null }

/** Who the form acts on: cédula, name and the status of their latest certificate (if any). */
export function MedicalSubjectStrip(props: MedicalSubjectStripProps) {
  if (props.loading) {
    return (
      <div className={styles.strip}>
        <Lamp status="sin-datos" size="md" />
        <span className={styles.nombre}>Cargando identidad…</span>
      </div>
    )
  }
  return (
    <div className={styles.strip}>
      {props.status ? <StatusBadge status={props.status} size="md" /> : <Lamp status="sin-datos" size="md" />}
      <span className={styles.cedula}>{props.cedula}</span>
      <span className={styles.nombre}>{props.nombre}</span>
    </div>
  )
}
