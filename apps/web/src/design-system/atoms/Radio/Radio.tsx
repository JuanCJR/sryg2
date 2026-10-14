import { forwardRef, type InputHTMLAttributes } from 'react'
import clsx from '../../utils/clsx'
import styles from './Radio.module.css'

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio({ className, ...rest }, ref) {
  return (
    <span className={clsx(styles.wrapper, className)}>
      <input ref={ref} type="radio" className={styles.input} {...rest} />
      <span className={styles.circle} aria-hidden="true">
        <span className={styles.dot} />
      </span>
    </span>
  )
})
