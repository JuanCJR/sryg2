import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { Icon } from '../Icon/Icon'
import inputStyles from '../Input/Input.module.css'
import clsx from '../../utils/clsx'
import styles from './Select.module.css'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <span className={styles.wrapper}>
      <select ref={ref} className={clsx(inputStyles.control, styles.select, className)} {...rest}>
        {children}
      </select>
      <Icon icon={ChevronDown} size={16} className={styles.chevron} />
    </span>
  )
})
