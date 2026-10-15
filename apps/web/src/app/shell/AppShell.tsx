import { useCallback, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { NavDrawer } from './NavDrawer'
import { NavRail } from './NavRail'
import { AppFooter } from './AppFooter'
import { TopStrip } from './TopStrip'
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
