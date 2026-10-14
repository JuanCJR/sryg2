import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Icon } from '../../design-system'
import { ROLE_LABEL } from '../role/permissions'
import { useRole } from '../role/useRole'
import { RoleMenuContent } from './RoleMenuContent'
import styles from './UserMenu.module.css'

/** "operador.demo" button opening a role switch, Perfil link, and Cerrar sesión. */
export function UserMenu() {
  const { role } = useRole()
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
        <span className={styles.name}>operador.demo</span>
        <span className={styles.roleTag}>{ROLE_LABEL[role]}</span>
        <Icon icon={ChevronDown} size={16} />
      </button>
      {open ? (
        <div className={styles.panel} role="menu">
          <RoleMenuContent idPrefix="user-menu" onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  )
}
