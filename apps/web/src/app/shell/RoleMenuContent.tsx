import { NavLink, useNavigate } from 'react-router'
import { Radio } from '../../design-system'
import { ROLES, ROLE_LABEL } from '../role/permissions'
import { sessionStore } from '../../features/auth/domain/session'
import { PATHS } from '../routes'
import { useRole } from '../role/useRole'
import styles from './RoleMenuContent.module.css'

export interface RoleMenuContentProps {
  idPrefix: string
  onNavigate?: () => void
}

/** "Rol (demostración)" switch + Perfil link + Cerrar sesión — shared by UserMenu and the phone drawer. */
export function RoleMenuContent({ idPrefix, onNavigate }: RoleMenuContentProps) {
  const { role, setRole } = useRole()
  const navigate = useNavigate()

  const signOut = () => {
    sessionStore.clear()
    onNavigate?.()
    navigate(PATHS.login, { replace: true })
  }

  return (
    <div className={styles.block}>
      <div role="radiogroup" aria-label="Rol (demostración)">
        <p className={styles.groupLabel}>Rol (demostración)</p>
        {ROLES.map((option) => {
          const id = `${idPrefix}-role-${option}`
          return (
            <label key={option} htmlFor={id} className={styles.roleOption}>
              <Radio id={id} name={`${idPrefix}-role`} checked={role === option} onChange={() => setRole(option)} />
              <span className={styles.roleOptionLabel}>{ROLE_LABEL[option]}</span>
            </label>
          )
        })}
      </div>
      <hr className={styles.rule} />
      <NavLink to="/perfil" className={styles.link} onClick={onNavigate}>
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
