import { NavLink } from 'react-router'
import { Icon } from '../../design-system'
import { useRole } from '../role/useRole'
import { NAV_ITEMS } from './nav-items'
import styles from './NavRail.module.css'

export function NavRail() {
  const { can } = useRole()
  const visible = NAV_ITEMS.filter((item) => !item.permission || can(item.permission))
  const primary = visible.filter((item) => !item.adminGroup)
  const admin = visible.filter((item) => item.adminGroup)

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => (
    <NavLink
      key={item.path}
      to={item.path}
      className={({ isActive }) => `${styles.item}${isActive ? ` ${styles.itemActive}` : ''}`}
    >
      <Icon icon={item.icon} size={20} />
      <span className={styles.label}>{item.label}</span>
      <span className={styles.shortLabel}>{item.shortLabel}</span>
    </NavLink>
  )

  return (
    <nav className={styles.rail} aria-label="Navegación principal">
      <div className={styles.group}>{primary.map(renderItem)}</div>
      {admin.length > 0 ? (
        <div className={styles.group}>
          <p className={styles.groupLabel}>Administración</p>
          {admin.map(renderItem)}
        </div>
      ) : null}
    </nav>
  )
}
