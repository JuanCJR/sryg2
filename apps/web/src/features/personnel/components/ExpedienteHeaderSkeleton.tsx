import { Skeleton } from '../../../design-system'
import styles from './ExpedienteHeaderSkeleton.module.css'

/** Identity skeleton (avatar, cédula, line bars) shown while the Expediente loads — passed to `DetailPageTemplate` as `headerSkeleton`. */
export function ExpedienteHeaderSkeleton() {
  return (
    <div className={styles.loadingIdentity}>
      <Skeleton className={styles.skeletonAvatar} />
      <div className={styles.loadingBody}>
        <Skeleton className={styles.skeletonCedula} />
        <Skeleton className={styles.skeletonLine} />
        <Skeleton className={styles.skeletonLineShort} />
        <Skeleton className={styles.skeletonLineShort} />
      </div>
    </div>
  )
}
