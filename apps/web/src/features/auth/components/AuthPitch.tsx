import type { CSSProperties } from 'react'
import styles from './AuthPitch.module.css'

const COVERAGE = [
  'Alertas de credenciales próximas a vencer o vencidas.',
  'Bloqueo de emisión ante impedimentos registrados.',
  'Auditoría de cada cambio: quién, qué y cuándo.',
]

const stagger = (seconds: number) => ({ '--d': `${seconds}s` }) as CSSProperties

/** Brand-panel copy of the signed-out screens; fades up in sequence after the radar draws. */
export function AuthPitch() {
  return (
    <>
      <h2 className={styles.headline} style={stagger(0.9)}>
        Un expediente electrónico por persona.
      </h2>
      <p className={styles.support} style={stagger(1.15)}>
        Licencias, habilitaciones y certificados médicos del personal aeronáutico del INAC, con control de vigencia y
        trazabilidad.
      </p>
      <ul className={styles.list}>
        {COVERAGE.map((item, index) => (
          <li key={item} className={styles.item} style={stagger(1.4 + index * 0.15)}>
            <i className={styles.tick} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
