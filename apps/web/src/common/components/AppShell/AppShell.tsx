import { useCallback, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { AppFooter } from '../AppFooter/AppFooter'
import { NavDrawer } from '../NavDrawer/NavDrawer'
import { NavRail } from '../NavRail/NavRail'
import { TopStrip } from '../TopStrip/TopStrip'
import styles from './AppShell.module.css'

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  // Stable identity: useFocusTrap's effect must not re-run just because this closure changed.
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  return (
    <>
      <a href="#contenido" className={styles.skipLink}>
        Saltar al contenido
      </a>
      <TopStrip onOpenMenu={openDrawer} menuButtonRef={menuButtonRef} />
      <div className={styles.layout}>
        <NavRail />
        <div className={styles.content}>
          <main id="contenido" className={styles.main}>
            <Outlet />
          </main>
          <AppFooter />
        </div>
      </div>
      <NavDrawer open={drawerOpen} onClose={closeDrawer} />
    </>
  )
}
