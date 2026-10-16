import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from '../Button/Button'
import clsx from '../../utils/clsx'
import styles from './ReviewDialog.module.css'

export interface ReviewRow {
  label: string
  value: ReactNode
}

export interface ReviewSection {
  title: string
  rows: readonly ReviewRow[]
}

export interface ReviewDialogProps {
  open: boolean
  title: string
  /** What happens on confirm, in plain words. */
  intro?: string
  sections: readonly ReviewSection[]
  confirmLabel: string
  cancelLabel?: string
  /** The confirmed request is in flight: confirm shows a spinner and nothing can be dismissed. */
  submitting?: boolean
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

const DEFAULT_INTRO =
  'Revise la información ingresada antes de confirmar. Al confirmar, el registro queda en el expediente y en la auditoría.'

/**
 * The review step of a registration: a modal preview of the data the operator entered, grouped
 * in sections, with "Volver y corregir" and the confirm action. Nothing is sent until confirmed.
 */
export function ReviewDialog({
  open,
  title,
  intro = DEFAULT_INTRO,
  sections,
  confirmLabel,
  cancelLabel = 'Volver y corregir',
  submitting = false,
  onConfirm,
  onCancel,
  className,
}: ReviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const introId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      // jsdom and old engines lack showModal: fall back to a non-modal open dialog.
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={clsx(styles.dialog, className)}
      aria-labelledby={titleId}
      aria-describedby={introId}
      onCancel={(event) => {
        // The `open` prop drives the dialog; Escape is ignored while the request is in flight.
        event.preventDefault()
        if (!submitting) onCancel()
      }}
    >
      {open ? (
        <div className={styles.body}>
          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <p id={introId} className={styles.intro}>
              {intro}
            </p>
          </header>
          <div className={styles.sections}>
            {sections.map((section) => (
              <section key={section.title} className={styles.section} aria-label={section.title}>
                <h3 className={styles.sectionTitle}>{section.title}</h3>
                <dl className={styles.rows}>
                  {section.rows.map((row, index) => (
                    <div key={`${index}-${row.label}`} className={styles.row}>
                      <dt className={styles.label}>{row.label}</dt>
                      <dd className={styles.value}>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
          <footer className={styles.actions}>
            <Button variant="secondary" disabled={submitting} onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button variant="primary" loading={submitting} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </footer>
        </div>
      ) : null}
    </dialog>
  )
}
