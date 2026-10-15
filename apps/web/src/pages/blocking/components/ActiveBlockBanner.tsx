import { BLOCKED_STATE_LABEL, Notice } from '../../../common/components'
import styles from './ActiveBlockBanner.module.css'

export interface ActiveBlockBannerItem {
  id: string
  reference: string
  typeLabel: string
  reason: string
}

export interface ActiveBlockBannerProps {
  blocks: ActiveBlockBannerItem[]
  /** What the blocks stop, in plain words. */
  stopsLabel: string
  /** Opens the Bloqueos page key; unset when it is already open. */
  onShow?: () => void
}

/** Persistent warning while the person has an active block (BR-07): it never dismisses itself. */
export function ActiveBlockBanner({ blocks, stopsLabel, onShow }: ActiveBlockBannerProps) {
  const count = blocks.length
  return (
    <Notice
      tone="warning"
      className={styles.banner}
      title={`${BLOCKED_STATE_LABEL} · ${count} ${count === 1 ? 'bloqueo activo' : 'bloqueos activos'}`}
      action={
        onShow ? (
          <button type="button" className={styles.link} onClick={onShow}>
            Ver bloqueos
          </button>
        ) : undefined
      }
    >
      <p>Se detiene la {stopsLabel} hasta resolverlo.</p>
      <ul className={styles.list}>
        {blocks.map((block) => (
          <li key={block.id}>
            <span className={styles.reference}>{block.reference}</span> {block.typeLabel} — {block.reason}
          </li>
        ))}
      </ul>
    </Notice>
  )
}
