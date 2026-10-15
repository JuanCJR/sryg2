import { NavLink } from 'react-router'
import { sessionStore } from '../../services/session'
import { PATHS } from '../../../routes'
import styles from './RoleMenuContent.module.css'

export interface RoleMenuContentProps {
  onNavigate?: () => void
}

/** Perfil link + Cerrar sesión — shared by UserMenu and the phone drawer. */
export function RoleMenuContent({ onNavigate }: RoleMenuContentProps) {
  // The route gate then shows the login, without a `next`: there is no page to come back to.
  const signOut = () => {
    onNavigate?.()
    sessionStore.signOut()
  }

  return (
    <div className={styles.block}>
      <NavLink to={PATHS.profile} className={styles.link} onClick={onNavigate}>
        Perfil
      </NavLink>
      {import.meta.env.DEV ? (
        <NavLink to="/catalogo" className={styles.link} onClick={onNavigate}>
          Catálogo de componentes (DEV)
        </NavLink>
      ) : null}
      <button type="button" className={styles.signOut} onClick={signOut}>
        Cerrar sesión
      </button>
    </div>
  )
}
