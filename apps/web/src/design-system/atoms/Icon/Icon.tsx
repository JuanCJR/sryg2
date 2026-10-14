import type { LucideIcon } from 'lucide-react'
import clsx from '../../utils/clsx'
import styles from './Icon.module.css'

export type IconSize = 16 | 20 | 24

export interface IconProps {
  /** The lucide-react icon component to render. */
  icon: LucideIcon
  size?: IconSize
  /** Accessible name. Omit for a purely decorative icon (default). */
  label?: string
  spin?: boolean
  className?: string
}

export function Icon({ icon: Glyph, size = 20, label, spin = false, className }: IconProps) {
  return (
    <Glyph
      size={size}
      strokeWidth={1.75}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      className={clsx(styles.icon, spin && styles.spin, className)}
    />
  )
}
