import type { ReactNode } from 'react'
import styles from './FormSection.module.css'

export interface FormSectionProps {
  legend: string
  description?: ReactNode
  children: ReactNode
}

/**
 * One hairline-separated section of a form-style page (e.g. LICENCIA, HABILITACIONES). Renders
 * as a nested `<fieldset>`/`<legend>` pair — `FormPageTemplate`'s own outer `<fieldset disabled>`
 * (while `submitting`) disables every control inside automatically, nested fieldsets included.
 */
export function FormSection({ legend, description, children }: FormSectionProps) {
  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>{legend}</legend>
      {description ? <p className={styles.description}>{description}</p> : null}
      <div className={styles.body}>{children}</div>
    </fieldset>
  )
}
