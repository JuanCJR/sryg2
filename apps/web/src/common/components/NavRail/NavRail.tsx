import { NavLink } from 'react-router'
import { Icon } from '..'
import { useRole } from '../../hooks/useRole'
import { visibleNavGroups, type NavItem } from '../../utils/nav-items'
import styles from './NavRail.module.css'

export function NavRail() {
  const { role, area } = useRole()
  const groups = role && area ? visibleNavGroups(role, area) : []

  const renderItem = (item: NavItem) => (
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
      {groups.map((group) => (
        <div key={group.id} className={styles.group} role="group" aria-label={group.label}>
          {group.label ? <p className={styles.groupLabel}>{group.label}</p> : null}
          {group.items.map(renderItem)}
        </div>
      ))}
    </nav>
  )
}
