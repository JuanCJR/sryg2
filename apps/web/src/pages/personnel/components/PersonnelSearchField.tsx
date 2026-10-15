import { useEffect, useId, useRef } from 'react'
import { Search } from 'lucide-react'
import styles from './PersonnelSearchField.module.css'

export interface PersonnelSearchFieldProps {
  value: string
  onChange: (value: string) => void
  /** Disabled while the registry failed to load — the field stays visible but inert. */
  disabled?: boolean
}

/**
 * The console's full-width lookup field (List direction brief: "about 56px tall, focus with
 * '/'"). A dedicated field rather than the shared `Input` atom, since its height is an
 * intentional exception to the 36–44px control scale for this one signature surface.
 */
export function PersonnelSearchField({ value, onChange, disabled = false }: PersonnelSearchFieldProps) {
  const id = useId()
  const descriptionId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (disabled) {
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping =
        Boolean(target) && (target!.tagName === 'INPUT' || target!.tagName === 'TEXTAREA' || target!.isContentEditable)
      if (event.key === '/' && !isTyping) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [disabled])

  return (
    <div className={styles.field}>
      <label htmlFor={id} className="visually-hidden">
        Buscar por nombre o cédula
      </label>
      <span id={descriptionId} className="visually-hidden">
        Atajo de teclado: presione la tecla diagonal (/) para enfocar esta búsqueda.
      </span>
      <Search size={18} strokeWidth={1.75} className={styles.icon} aria-hidden="true" />
      <input
        ref={inputRef}
        id={id}
        type="search"
        className={styles.input}
        value={value}
        disabled={disabled}
        aria-describedby={descriptionId}
        placeholder="Nombre o cédula…"
        onChange={(event) => onChange(event.target.value)}
      />
      {!disabled && !value ? (
        <span className={styles.keyCap} aria-hidden="true">
          /
        </span>
      ) : null}
    </div>
  )
}
