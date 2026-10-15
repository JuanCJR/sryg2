import styles from './VerificationPitch.module.css'

/** Brand-panel copy of the public check: what the page shows and what it never shows (D9). */
export function VerificationPitch() {
  return (
    <>
      <h2 className={styles.headline}>Verificación de credenciales.</h2>
      <p className={styles.support}>
        El código QR de cada licencia y certificado médico del INAC confirma su tipo, número, estado y vencimiento.
        No muestra datos personales.
      </p>
    </>
  )
}
