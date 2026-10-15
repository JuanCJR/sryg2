import clsx from '../../lib/clsx'
import styles from './AppFooter.module.css'

const YEAR = new Date().getFullYear()

export interface AppFooterProps {
  /** Only the legal line, centered (signed-out screens). */
  compact?: boolean
}

/** Legal footer at the end of every page: the app shell and the signed-out screens. */
export function AppFooter({ compact = false }: AppFooterProps) {
  return (
    <footer className={clsx(styles.footer, compact && styles.compact)}>
      <p className={styles.rights}>
        © {YEAR} Instituto Nacional de Aeronáutica Civil (INAC). Todos los derechos reservados.
      </p>
      {compact ? null : <p>SRYG · Sistema automatizado de gestión de credenciales aeronáuticas · INAC Maracay</p>}
    </footer>
  )
}
