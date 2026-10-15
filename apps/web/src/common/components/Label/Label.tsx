import type { LabelHTMLAttributes } from 'react'
import clsx from '../../utils/clsx'
import styles from './Label.module.css'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function Label({ required = false, className, children, ...rest }: LabelProps) {
  return (
    <label className={clsx(styles.label, className)} {...rest}>
      {children}
      {required ? (
        <span className={styles.required} aria-hidden="true">
          *
        </span>
      ) : null}
      {required ? <span className="visually-hidden">obligatorio</span> : null}
    </label>
  )
}
