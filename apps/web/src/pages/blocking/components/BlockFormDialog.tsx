import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from '../../../common/components'
import styles from './BlockFormDialog.module.css'

export interface BlockFormDialogProps {
  title: string
  /** Plain-language sentence naming what the action does. */
  consequence: string
  submitLabel: string
  submitting: boolean
  /** Server-side failure, shown above the actions. */
  error: string | null
  onSubmit: () => void
  onCancel: () => void
  /** The form fields. */
  children: ReactNode
}

/**
 * Modal form with the ConfirmDialog frame (square, hairline, one primary action), for register and
 * resolve. It is open while mounted: callers render it conditionally, so fields start blank each time.
 */
export function BlockFormDialog({
  title,
  consequence,
  submitLabel,
  submitting,
  error,
  onSubmit,
  onCancel,
  children,
}: BlockFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    // jsdom and old engines lack showModal: fall back to a non-modal open dialog.
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // The `open` prop drives the dialog; Escape only asks the owner to close it.
        event.preventDefault()
        if (!submitting) onCancel()
      }}
    >
      <form
        className={styles.body}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (!submitting) onSubmit()
        }}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.consequence}>{consequence}</p>
        {children}
        {error ? (
          <p className={styles.error} role="status">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
