import { forwardRef, type InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'
import { Icon } from '../Icon/Icon'
import clsx from '../../utils/clsx'
import styles from './Checkbox.module.css'

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ className, ...rest }, ref) {
  return (
    <span className={clsx(styles.wrapper, className)}>
      <input ref={ref} type="checkbox" className={styles.input} {...rest} />
      <span className={styles.box} aria-hidden="true">
        <Icon icon={Check} size={16} className={styles.check} />
      </span>
    </span>
  )
})
