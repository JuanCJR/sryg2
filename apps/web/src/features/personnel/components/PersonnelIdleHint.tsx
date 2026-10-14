import styles from './PersonnelIdleHint.module.css'

/**
 * Shown in the results region before any query or lamp filter is active — the registry holds
 * thousands of people, so the console never renders an unfiltered grid on arrival (List
 * direction brief). Query and lamp filters are the only ways into the data.
 */
export function PersonnelIdleHint() {
  return (
    <div className={styles.hint}>
      <p className={styles.title}>Escriba un nombre o cédula, o presione una lámpara</p>
      <p className={styles.message}>
        El registro tiene miles de personas: la búsqueda y los filtros de estado son las únicas formas de entrar.
      </p>
    </div>
  )
}
