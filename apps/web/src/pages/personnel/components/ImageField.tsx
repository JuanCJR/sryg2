import { useId, type ChangeEvent } from 'react'
import { AlertTriangle, ImageOff } from 'lucide-react'
import { Label } from '../../../common/components'
import clsx from '../../../common/utils/clsx'
import styles from './ImageField.module.css'

export interface ImageFieldProps {
  label: string
  /** Accessible name of the preview image, e.g. "Vista previa de la foto". */
  previewAlt: string
  /** Object URL of the chosen file or of the stored image; undefined when there is none. */
  previewUrl?: string
  hint: string
  error?: string
  /** `portrait` for the photo, `wide` for the signature. */
  shape: 'portrait' | 'wide'
  onSelect: (file: File) => void
}

const ACCEPT = 'image/jpeg,image/png,image/webp'

/** A file input with its preview: the photo or the signature of the holder (D5). */
export function ImageField({ label, previewAlt, previewUrl, hint, error, shape, onSelect }: ImageFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onSelect(file)
    // Choosing the same file again must fire a new change.
    event.target.value = ''
  }

  return (
    <div className={styles.field}>
      <Label htmlFor={id}>{label}</Label>
      <div className={clsx(styles.frame, shape === 'wide' && styles.wide)}>
        {previewUrl ? (
          <img className={styles.preview} src={previewUrl} alt={previewAlt} />
        ) : (
          <span className={styles.empty}>
            <ImageOff size={20} strokeWidth={1.5} aria-hidden="true" />
            Sin imagen
          </span>
        )}
      </div>
      <input
        id={id}
        type="file"
        accept={ACCEPT}
        className={styles.input}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        aria-invalid={Boolean(error)}
        onChange={handleChange}
      />
      <span id={hintId} className={styles.hint}>
        {hint}
      </span>
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
