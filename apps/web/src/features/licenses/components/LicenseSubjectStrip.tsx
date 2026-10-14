import { Lamp, StatusBadge, type CredentialStatus } from '../../../design-system'
import styles from './LicenseSubjectStrip.module.css'

export type LicenseSubjectStripProps =
  { loading: true } | { loading?: false; cedula: string; nombre: string; overallStatus: CredentialStatus | null }

/**
 * Compact identity strip for the form's `subject` slot: cédula, nombre, overall lamp. Renders a
 * quiet placeholder while the person is not resolved yet (loading/error), so the template's
 * reserved `subject` band shows the same strip shape in every status — nothing reflows once the
 * real identity resolves. A person with no license yet has no status: the lamp stays unlit.
 */
export function LicenseSubjectStrip(props: LicenseSubjectStripProps) {
  if (props.loading) {
    return (
      <div className={styles.strip}>
        {/* 'sin-datos', not a real status — the person isn't resolved yet. */}
        <Lamp status="sin-datos" size="md" />
        <span className={styles.nombre}>Cargando identidad…</span>
      </div>
    )
  }

  const { cedula, nombre, overallStatus } = props
  return (
    <div className={styles.strip}>
      {overallStatus ? <StatusBadge status={overallStatus} size="md" /> : <Lamp status="sin-datos" size="md" />}
      <span className={styles.cedula}>{cedula}</span>
      <span className={styles.nombre}>{nombre}</span>
    </div>
  )
}
