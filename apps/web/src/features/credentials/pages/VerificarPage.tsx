import { PendingScreen } from '../../../app/templates/PendingScreen'
import styles from './VerificarPage.module.css'

/** Public credential verification (D9), outside the shell. Placeholder; W2-2 feat/credentials-pdf replaces it. */
export function VerificarPage() {
  return (
    <main className={styles.page}>
      <PendingScreen title="Verificación de credencial" plannedChange="W2-2 feat/credentials-pdf" />
    </main>
  )
}
