import type { ReactNode } from 'react'
import mark from '../../assets/sryg-mark.jpg'
import { useTheme } from '../../design-system'
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
 * product mark and the entrance animation); only the form column follows the day/night theme. Below 1025px
 * the panel collapses to the mark header.
 */
export function AuthTemplate({ visual, pitch, children }: AuthTemplateProps) {
  const { resolved, setMode } = useTheme()
  const next = resolved === 'day' ? 'night' : 'day'

  return (
    <div className={styles.page}>
      <aside className={styles.panel}>
        <div className={styles.brand}>
          <img className={styles.mark} src={mark} width={48} height={48} alt="SRYG" />
          <div className={styles.brandText}>
            <span className={styles.caps}>SRYG</span>
            <span className={styles.sub}>INAC Maracay</span>
          </div>
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
      </section>
    </div>
  )
}
