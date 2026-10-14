import { useRef } from 'react'
import { NavLink } from 'react-router'
import { X } from 'lucide-react'
import { IconButton, Icon } from '../../design-system'
import { AREA_LABEL, ROLE_LABEL } from '../role/labels'
import { useRole } from '../role/useRole'
import { visibleNavGroups } from './nav-items'
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
  const { user, role, area } = useRole()
  const clock = useClock()
  const drawerRef = useRef<HTMLDivElement>(null)
  useFocusTrap(drawerRef, open, onClose)

  const groups = role && area ? visibleNavGroups(role, area) : []

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
          <span className={styles.name}>SRYG</span>
          <IconButton icon={X} aria-label="Cerrar menú" onClick={onClose} />
        </div>

        <span className={styles.clock}>{clock}</span>
        <ThemeKeys idPrefix="drawer" />

        <hr className={styles.rule} />

        <nav className={styles.section} aria-label="Navegación principal">
          {groups.map((group) => (
            <div key={group.id} role="group" aria-label={group.label}>
              {group.label ? <p className={styles.groupLabel}>{group.label}</p> : null}
              {group.items.map((item) => (
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
            </div>
          ))}
        </nav>

        <hr className={styles.rule} />

        <div className={styles.identity}>
          <span className={styles.name}>{user?.fullName}</span>
          {role && area ? (
            <span className={styles.roleTag}>
              {ROLE_LABEL[role]} · {AREA_LABEL[area]}
            </span>
          ) : null}
        </div>
        <RoleMenuContent onNavigate={onClose} />
      </div>
    </>
  )
}
