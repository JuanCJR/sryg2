import { useState } from 'react'
import { UserRound } from 'lucide-react'
import clsx from '../../utils/clsx'
import styles from './Avatar.module.css'

export type AvatarSize = 'sm' | 'lg'

export interface AvatarProps {
  src?: string
  alt: string
  size?: AvatarSize
  className?: string
}

/** Square photo thumbnail with an authored neutral silhouette fallback. */
export function Avatar({ src, alt, size = 'sm', className }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const [lastSrc, setLastSrc] = useState(src)

  // Reset during render (not an effect) so a stale error from the previous photo never sticks.
  if (src !== lastSrc) {
    setLastSrc(src)
    setFailed(false)
  }

  const showImage = Boolean(src) && !failed

  return (
    <span className={clsx(styles.avatar, styles[size], className)}>
      {showImage ? (
        <img className={styles.image} src={src} alt={alt} onError={() => setFailed(true)} />
      ) : (
        <UserRound size={size === 'lg' ? 48 : 20} strokeWidth={1.5} role="img" aria-label={alt} />
      )}
    </span>
  )
}
