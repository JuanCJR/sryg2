import { useId, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Label } from '../Label/Label'
import styles from './FormField.module.css'

export interface FormFieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

export interface FormFieldProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: (controlProps: FormFieldControlProps) => ReactNode
}

/** Wires label, hint, and error ids to the control it renders. */
export function FormField({ label, hint, error, required = false, children }: FormFieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.field}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}
      {hint ? (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      ) : null}
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
