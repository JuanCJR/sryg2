import type { PublicVerification } from '@sryg/types'
import { Lamp, Notice, Skeleton } from '../../../design-system'
import { formatDate, VERIFICATION_KIND_LABEL, VERIFICATION_STATUS } from '../domain/credential-view'
import styles from './VerificationResult.module.css'

export type VerificationState =
  | { kind: 'loading' }
  | { kind: 'found'; credential: PublicVerification }
  | { kind: 'not-found' }
  | { kind: 'throttled' }
  | { kind: 'error'; retry: () => void }

/** The answer of the QR check (D9): only the kind, the number, the status and the expiry. */
export function VerificationResult({ state }: { state: VerificationState }) {
  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>INAC · Verificación pública</p>
        <h1 className={styles.title}>Verificación de credencial</h1>
      </header>
      {state.kind === 'loading' ? (
        <div className={styles.skeletons} aria-busy="true">
          <span className="visually-hidden" role="status">
            Consultando la credencial…
          </span>
          <Skeleton className={styles.skeleton} />
          <Skeleton className={styles.skeleton} />
        </div>
      ) : state.kind === 'found' ? (
        <Found credential={state.credential} />
      ) : state.kind === 'not-found' ? (
        <Notice tone="warning" title="Credencial no encontrada">
          No encontramos una credencial con este código. Revise que el QR o el enlace estén completos.
        </Notice>
      ) : state.kind === 'throttled' ? (
        <Notice tone="caution" title="Demasiadas consultas">
          Se alcanzó el límite de consultas desde esta conexión. Espere un minuto y vuelva a intentar.
        </Notice>
      ) : (
        <Notice
          tone="caution"
          title="No se pudo verificar"
          action={
            <button type="button" className={styles.retry} onClick={state.retry}>
              Reintentar
            </button>
          }
        >
          El servicio no respondió. Intente de nuevo en unos momentos.
        </Notice>
      )}
    </div>
  )
}

function Found({ credential }: { credential: PublicVerification }) {
  const status = VERIFICATION_STATUS[credential.status]
  return (
    <dl className={styles.facts}>
      <div className={styles.fact}>
        <dt className={styles.label}>Tipo</dt>
        <dd className={styles.value}>{VERIFICATION_KIND_LABEL[credential.kind]}</dd>
      </div>
      <div className={styles.fact}>
        <dt className={styles.label}>Número</dt>
        <dd className={`${styles.value} ${styles.mono}`}>{credential.number}</dd>
      </div>
      <div className={styles.fact}>
        <dt className={styles.label}>Estado</dt>
        <dd className={`${styles.value} ${styles.status}`}>
          <Lamp status={status.lamp} size="lg" />
          <span>{status.label}</span>
        </dd>
      </div>
      <div className={styles.fact}>
        <dt className={styles.label}>Vencimiento</dt>
        <dd className={`${styles.value} ${styles.mono}`}>{formatDate(credential.expiryDate)}</dd>
      </div>
    </dl>
  )
}
