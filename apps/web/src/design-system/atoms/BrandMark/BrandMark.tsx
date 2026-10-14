import mark from '../../../assets/sryg-mark.jpg'
import { useTheme } from '../../theme/useTheme'
import clsx from '../../utils/clsx'
import styles from './BrandMark.module.css'

export interface BrandMarkProps {
  size?: number
  className?: string
}

// Binding asset, never redrawn — blended against the surface so only the mark shows in either mode.
export function BrandMark({ size = 32, className }: BrandMarkProps) {
  const { resolved } = useTheme()
  return (
    <img
      src={mark}
      alt="SRYG"
      width={size}
      height={size}
      className={clsx(styles.mark, resolved === 'day' ? styles.day : styles.night, className)}
    />
  )
}
