import { forwardRef, type ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { Icon } from '../Icon/Icon'
import clsx from '../../utils/clsx'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'md' | 'sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: LucideIcon
  iconPosition?: 'leading' | 'trailing'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'leading',
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const glyph = loading ? Loader2 : icon
  const iconEl = glyph ? <Icon icon={glyph} size={16} spin={loading} /> : null

  return (
    <button
      ref={ref}
      type={type}
      className={clsx(styles.button, styles[variant], size === 'sm' && styles.sm, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {iconEl && iconPosition === 'leading' ? iconEl : null}
      {children}
      {iconEl && iconPosition === 'trailing' ? iconEl : null}
    </button>
  )
})
