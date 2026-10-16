import type { ReactNode } from 'react'
import clsx from '../../utils/clsx'
import styles from './TableFrame.module.css'

export interface TableFrameProps {
  children: ReactNode
  className?: string
}

/**
 * The container every data table sits in: a surface card with a hairline border and a tinted
 * header row, which scrolls sideways when the table is wider than the screen. Tables inside it
 * drop their own outer border.
 */
export function TableFrame({ children, className }: TableFrameProps) {
  return (
    <div className={clsx(styles.frame, className)}>
      <div className={styles.scroll}>{children}</div>
    </div>
  )
}
