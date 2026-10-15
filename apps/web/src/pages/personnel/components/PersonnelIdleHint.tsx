import styles from './PersonnelIdleHint.module.css'

/**
 * Shown in the results region before any query or lamp filter is active — the registry holds
 * thousands of people, so the console never renders an unfiltered grid on arrival (List
 * direction brief). The query is the way into the data (lamp filters: W1-5/W1-6).
 */
export function PersonnelIdleHint() {
  return (
    <div className={styles.hint}>
      <p className={styles.title}>Escriba un nombre o una cédula</p>
      <p className={styles.message}>
        El registro tiene miles de personas: la búsqueda es la forma de entrar. El filtro por estado llega con las
        licencias y los certificados médicos.
      </p>
    </div>
  )
}
