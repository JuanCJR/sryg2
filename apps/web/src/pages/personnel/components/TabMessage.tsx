import { Button } from '../../../common/components'
import styles from './TabMessage.module.css'

export interface TabMessageProps {
  title: string
  message: string
  /** Shows "Reintentar" (error states). */
  onRetry?: () => void
}

/** Empty or error state inside an Expediente page key. */
export function TabMessage({ title, message, onRetry }: TabMessageProps) {
  return (
    <div className={styles.message} role={onRetry ? 'alert' : undefined}>
      <p className={styles.title}>{title}</p>
      <p className={styles.body}>{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}
