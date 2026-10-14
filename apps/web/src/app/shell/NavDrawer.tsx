import { useRef } from 'react'
import { NavLink } from 'react-router'
import { X } from 'lucide-react'
import { IconButton, Icon } from '../../design-system'
import { ROLE_LABEL } from '../role/permissions'
import { useRole } from '../role/useRole'
import { NAV_ITEMS } from './nav-items'
import { RoleMenuContent } from './RoleMenuContent'
import { ThemeKeys } from './ThemeKeys'
import { useClock } from './useClock'
import { useFocusTrap } from './useFocusTrap'
import styles from './NavDrawer.module.css'

export interface NavDrawerProps {
  open: boolean
  onClose: () => void
}

/** Phone off-canvas navigation: nav items plus the strip's clock/tag/theme/user controls. */
export function NavDrawer({ open, onClose }: NavDrawerProps) {
  const { role, can } = useRole()
  const clock = useClock()
  const drawerRef = useRef<HTMLDivElement>(null)
  useFocusTrap(drawerRef, open, onClose)

  const visible = NAV_ITEMS.filter((item) => !item.permission || can(item.permission))
  const primary = visible.filter((item) => !item.adminGroup)
  const admin = visible.filter((item) => item.adminGroup)

  return (
    <>
      <div
        className={`${styles.backdrop}${open ? ` ${styles.backdropOpen}` : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        id="nav-drawer"
        className={`${styles.drawer}${open ? ` ${styles.drawerOpen}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        inert={!open}
      >
        <div className={styles.header}>
          <span className={styles.tag}>Datos de demostración</span>
          <IconButton icon={X} aria-label="Cerrar menú" onClick={onClose} />
        </div>

        <span className={styles.clock}>{clock}</span>
        <ThemeKeys idPrefix="drawer" />

        <hr className={styles.rule} />

        <nav className={styles.section} aria-label="Navegación principal">
          {primary.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => `${styles.item}${isActive ? ` ${styles.itemActive}` : ''}`}
            >
              <Icon icon={item.icon} size={20} />
              <span className={styles.label}>{item.label}</span>
            </NavLink>
          ))}
          {admin.length > 0 ? (
            <>
              <p className={styles.groupLabel}>Administración</p>
              {admin.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) => `${styles.item}${isActive ? ` ${styles.itemActive}` : ''}`}
                >
                  <Icon icon={item.icon} size={20} />
                  <span className={styles.label}>{item.label}</span>
                </NavLink>
              ))}
            </>
          ) : null}
        </nav>

        <hr className={styles.rule} />

        <div className={styles.identity}>
          <span className={styles.name}>operador.demo</span>
          <span className={styles.roleTag}>{ROLE_LABEL[role]}</span>
        </div>
        <RoleMenuContent idPrefix="drawer" onNavigate={onClose} />
      </div>
    </>
  )
}
