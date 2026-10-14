import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './UserDialog.module.css'

export interface UserDialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** Modal frame of the Usuarios dialogs, with the same mechanics and look as the design system's ConfirmDialog. */
export function UserDialog({ open, title, onClose, children }: UserDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Escape goes through `open` like every other close.
        event.preventDefault()
        onClose()
      }}
    >
      {open ? (
        <div className={styles.body}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {children}
        </div>
      ) : null}
    </dialog>
  )
}
