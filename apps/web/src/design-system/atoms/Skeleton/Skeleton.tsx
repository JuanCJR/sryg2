import type { CSSProperties } from 'react'
import clsx from '../../utils/clsx'
import styles from './Skeleton.module.css'

export interface SkeletonProps {
  /** Size and shape come from the caller's own class (e.g. an avatar box, a cédula bar, a key block). */
  className?: string
  style?: CSSProperties
}

/**
 * Pulsing placeholder block, reduced-motion safe. Renders a bare `<span>` (no `aria-hidden`,
 * matching the Expediente's pre-migration skeleton markup byte for byte): pair it with a
 * visually-hidden `role="status"` text elsewhere for the loading announcement.
 */
export function Skeleton({ className, style }: SkeletonProps) {
  return <span className={clsx(styles.block, className)} style={style} />
}
