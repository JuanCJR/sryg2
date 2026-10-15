import styles from './PendingScreen.module.css'

export interface PendingScreenProps {
  title: string
  /** The planned change (feature slug) that will deliver this screen. */
  plannedChange: string
}

/** Placeholder for a route not yet built — names the planned change that will replace it. */
export function PendingScreen({ title, plannedChange }: PendingScreenProps) {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.status}>Pantalla en preparación</p>
      <p className={styles.note}>
        Esta pantalla llega con el cambio planificado <span className={styles.change}>{plannedChange}</span>.
      </p>
    </div>
  )
}
