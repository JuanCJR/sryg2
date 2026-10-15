import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Icon } from '..'
import { AREA_LABEL, ROLE_LABEL } from '../../utils/role-labels'
import { useRole } from '../../hooks/useRole'
import { RoleMenuContent } from '../RoleMenuContent/RoleMenuContent'
import styles from './UserMenu.module.css'

/** The signed-in user (name, role and area) opening the Perfil link and Cerrar sesión. */
export function UserMenu() {
  const { user, role, area } = useRole()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={styles.name}>{user?.fullName}</span>
        {role && area ? (
          <span className={styles.roleTag}>
            {ROLE_LABEL[role]} · {AREA_LABEL[area]}
          </span>
        ) : null}
        <Icon icon={ChevronDown} size={16} />
      </button>
      {open ? (
        <div className={styles.panel} role="menu">
          <RoleMenuContent onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  )
}
