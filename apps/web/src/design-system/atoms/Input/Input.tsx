import { forwardRef, type InputHTMLAttributes } from 'react'
import clsx from '../../utils/clsx'
import styles from './Input.module.css'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Use for cédulas, license numbers, and other figures — renders in B612 Mono. */
  mono?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { mono = false, className, ...rest },
  ref,
) {
  return <input ref={ref} className={clsx(styles.control, mono && styles.mono, className)} {...rest} />
})
