import { useId } from 'react'
import { AlertTriangle } from 'lucide-react'
import { PendingInacMark } from './PendingInacMark'
import styles from './GraphicResourceField.module.css'

export interface GraphicResourceFieldProps {
  label: string
  /** Accessible name of the file control, e.g. "Archivo del logo del INAC". */
  fileLabel: string
  /** Stored image, or null while INAC has not supplied it (the PDF prints a placeholder, D18). */
  current: { src: string | null; detail: string } | null
  /** Preview of the file chosen and not yet saved. */
  pendingSrc: string | null
  pendingName: string | null
  error?: string
  onSelect: (file: File) => void
}

/** One credential image of D18: what is stored, what will replace it, and the file control. */
export function GraphicResourceField({
  label,
  fileLabel,
  current,
  pendingSrc,
  pendingName,
  error,
  onSelect,
}: GraphicResourceFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className={styles.field}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        {current || pendingName ? null : <PendingInacMark />}
      </div>
      <div className={styles.previews}>
        <figure className={styles.preview}>
          {current?.src ? (
            <img src={current.src} alt={`${label} actual`} className={styles.image} />
          ) : (
            <span className={styles.empty}>{current ? 'Cargando…' : 'Sin imagen'}</span>
          )}
          <figcaption className={styles.caption}>{current ? `Actual · ${current.detail}` : 'Actual'}</figcaption>
        </figure>
        {pendingName ? (
          <figure className={styles.preview}>
            {pendingSrc ? <img src={pendingSrc} alt={`${label} nuevo`} className={styles.image} /> : null}
            <figcaption className={styles.caption}>Se guardará · {pendingName}</figcaption>
          </figure>
        ) : null}
      </div>
      <input
        type="file"
        accept="image/png,image/jpeg"
        aria-label={fileLabel}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={styles.file}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onSelect(file)
          event.target.value = ''
        }}
      />
      <span aria-live="polite">
        {error ? (
          <span id={errorId} className={styles.error}>
            <AlertTriangle size={14} strokeWidth={1.75} className={styles.errorIcon} aria-hidden="true" />
            {error}
          </span>
        ) : null}
      </span>
    </div>
  )
}
