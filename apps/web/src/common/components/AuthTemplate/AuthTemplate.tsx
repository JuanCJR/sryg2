import type { ReactNode } from 'react'
import inacLogo from '../../../assets/inac-logo.png'
import { useTheme } from '..'
import { AppFooter } from '../AppFooter/AppFooter'
import styles from './AuthTemplate.module.css'

export interface AuthTemplateProps {
  /** Decorative composition shown in the brand panel (hidden on phone and tablet). */
  visual?: ReactNode
  /** Headline, support copy and list shown at the bottom of the brand panel (hidden on phone and tablet). */
  pitch?: ReactNode
  /** The form column. */
  children: ReactNode
}

/**
 * Split "access door" layout for signed-out screens. The brand panel is always night-toned (it carries the
 * INAC logo and the entrance animation); only the form column follows the day/night theme. Below 1025px
 * the panel collapses to the INAC header.
 */
export function AuthTemplate({ visual, pitch, children }: AuthTemplateProps) {
  const { resolved, setMode } = useTheme()
  const next = resolved === 'day' ? 'night' : 'day'

  return (
    <div className={styles.page}>
      <aside className={styles.panel}>
        <div className={styles.brand}>
          <img
            className={styles.logo}
            src={inacLogo}
            width={132}
            height={64}
            alt="INAC, Instituto Nacional de Aeronáutica Civil"
          />
        </div>
        {visual ? (
          <div className={styles.stage} aria-hidden="true">
            {visual}
          </div>
        ) : null}
        {pitch ? <div className={styles.pitch}>{pitch}</div> : null}
      </aside>
      <section className={styles.side}>
        <header className={styles.strip}>
          <button
            type="button"
            className={styles.theme}
            onClick={() => setMode(next)}
            aria-label={next === 'day' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
          >
            {resolved === 'day' ? 'Día' : 'Noche'}
          </button>
        </header>
        <main className={styles.content}>
          <div className={styles.column}>{children}</div>
        </main>
        <AppFooter compact />
      </section>
    </div>
  )
}
