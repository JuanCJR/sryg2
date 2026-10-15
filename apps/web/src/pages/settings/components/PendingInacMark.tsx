import { PENDING_INAC_LABEL } from '@sryg/types'
import { Lamp } from '../../../common/components'
import styles from './PendingInacMark.module.css'

/**
 * D3/D18: marks a value or image INAC has not supplied yet. The unlit lamp reads as "no data yet",
 * never as a credential status.
 */
export function PendingInacMark() {
  return (
    <span className={styles.mark}>
      <Lamp status="sin-datos" size="sm" />
      {PENDING_INAC_LABEL}
    </span>
  )
}
