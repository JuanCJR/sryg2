import { Lamp, type LampSize } from '../Lamp/Lamp'
import { STATUS_META, type CredentialStatus } from '../../utils/credentialStatus'
import clsx from '../../utils/clsx'
import styles from './StatusBadge.module.css'

export interface StatusBadgeProps {
  status: CredentialStatus
  /** e.g. "21 d" — renders in mono figures. */
  detail?: string
  size?: LampSize
  className?: string
}

/** Readable without color: lamp (icon) + achromatic text label, never color alone. */
export function StatusBadge({ status, detail, size = 'md', className }: StatusBadgeProps) {
  const meta = STATUS_META[status]
  return (
    <span className={clsx(styles.badge, className)}>
      <Lamp status={status} size={size} />
      <span className={styles.label}>{meta.label}</span>
      {detail ? <span className={styles.detail}>{detail}</span> : null}
    </span>
  )
}
