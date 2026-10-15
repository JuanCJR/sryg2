import { Button, type ButtonProps } from '..'
import styles from './ComingSoon.module.css'

export interface ComingSoonPanelProps {
  /** What the tab will show. */
  description: string
  /** The planned branch that implements it. */
  plannedChange: string
}

/** Body of an Expediente tab whose feature is not built yet. */
export function ComingSoonPanel({ description, plannedChange }: ComingSoonPanelProps) {
  return (
    <div className={styles.panel}>
      <p className={styles.status}>Próximamente</p>
      <p className={styles.note}>
        {description} Llega con <span className={styles.change}>{plannedChange}</span>.
      </p>
    </div>
  )
}

/** An action whose feature is not built yet: same button, disabled, labeled "Próximamente". */
export function ComingSoonButton({ children, ...props }: Omit<ButtonProps, 'disabled' | 'onClick'>) {
  return (
    <Button {...props} disabled>
      {children}
      <span className={styles.badge}>· Próximamente</span>
    </Button>
  )
}
