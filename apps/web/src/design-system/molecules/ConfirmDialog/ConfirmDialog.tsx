import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '../../atoms/Button/Button'
import { Input } from '../../atoms/Input/Input'
import { Label } from '../../atoms/Label/Label'
import clsx from '../../utils/clsx'
import styles from './ConfirmDialog.module.css'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  /** Plain-language sentence naming what this action does — required, never a generic warning. */
  consequence: string
  /** When set, Confirm stays disabled until the input matches this string exactly (e.g. the cédula). */
  confirmText?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

interface DialogBodyProps {
  titleId: string
  inputId: string
  title: string
  consequence: string
  confirmText?: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// Mounted fresh (keyed by open/closed in the parent) so `typed` always starts blank.
function DialogBody({
  titleId,
  inputId,
  title,
  consequence,
  confirmText,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: DialogBodyProps) {
  const [typed, setTyped] = useState('')
  const confirmDisabled = confirmText !== undefined && typed !== confirmText

  return (
    <div className={styles.body}>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <p className={styles.consequence}>{consequence}</p>
      {confirmText !== undefined ? (
        <div className={styles.confirmField}>
          <Label htmlFor={inputId}>Escriba para confirmar</Label>
          <p className={styles.hint}>
            Escriba <span className={styles.confirmValue}>{confirmText}</span> para continuar.
          </p>
          <Input
            id={inputId}
            mono
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
      ) : null}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="primary" disabled={confirmDisabled} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  consequence,
  confirmText,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  className,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const inputId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={clsx(styles.dialog, className)}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Prevent the browser's own close on Escape; the `open` prop drives it instead.
        event.preventDefault()
        onCancel()
      }}
    >
      <DialogBody
        key={open ? 'open' : 'closed'}
        titleId={titleId}
        inputId={inputId}
        title={title}
        consequence={consequence}
        confirmText={confirmText}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </dialog>
  )
}
