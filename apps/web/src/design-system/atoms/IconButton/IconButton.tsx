import { forwardRef, type ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Icon, type IconSize } from '../Icon/Icon'
import clsx from '../../utils/clsx'
import styles from './IconButton.module.css'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: LucideIcon
  /** Required — an icon-only control must name its action for assistive tech. */
  'aria-label': string
  iconSize?: IconSize
  variant?: 'default' | 'ghost'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, iconSize = 20, variant = 'default', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(styles.button, variant === 'ghost' && styles.ghost, className)}
      {...rest}
    >
      <Icon icon={icon} size={iconSize} />
    </button>
  )
})
