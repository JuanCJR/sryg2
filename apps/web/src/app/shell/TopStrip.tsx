import type { RefObject } from 'react'
import { Menu } from 'lucide-react'
import { BrandMark, IconButton } from '../../design-system'
import { ThemeKeys } from './ThemeKeys'
import { UserMenu } from './UserMenu'
import { useClock } from './useClock'
import styles from './TopStrip.module.css'

export interface TopStripProps {
  onOpenMenu: () => void
  menuButtonRef?: RefObject<HTMLButtonElement | null>
}

export function TopStrip({ onOpenMenu, menuButtonRef }: TopStripProps) {
  const clock = useClock()

  return (
    <header className={styles.strip}>
      <div className={styles.brand}>
        <BrandMark size={20} />
        <span className={styles.brandName}>SRYG</span>
        <span className={styles.brandSub}>INAC</span>
      </div>
      <div className={styles.right}>
        <span className={styles.clock}>{clock}</span>
        <ThemeKeys idPrefix="topstrip" />
        <UserMenu />
      </div>
      <IconButton
        ref={menuButtonRef}
        icon={Menu}
        aria-label="Abrir menú de navegación"
        className={styles.menuButton}
        onClick={onOpenMenu}
      />
    </header>
  )
}
