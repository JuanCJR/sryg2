import { useTheme, type ThemeMode } from '..'
import styles from './ThemeKeys.module.css'

const OPTIONS: Array<{ mode: ThemeMode; label: string }> = [
  { mode: 'system', label: 'Sist' },
  { mode: 'day', label: 'Día' },
  { mode: 'night', label: 'Noche' },
]

export interface ThemeKeysProps {
  /** Namespaces the option ids — required so a desktop and drawer copy on the same page never collide. */
  idPrefix: string
}

/** SIST · DÍA · NOCHE mode switch, styled like PageKeys but semantically a radiogroup. */
export function ThemeKeys({ idPrefix }: ThemeKeysProps) {
  const { mode, setMode } = useTheme()

  return (
    <div role="radiogroup" aria-label="Modo de color" className={styles.group}>
      {OPTIONS.map((option) => (
        <button
          key={option.mode}
          id={`${idPrefix}-theme-${option.mode}`}
          type="button"
          role="radio"
          aria-checked={mode === option.mode}
          className={styles.key}
          onClick={() => setMode(option.mode)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
