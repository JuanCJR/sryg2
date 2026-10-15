import { useId, useRef, type ReactNode } from 'react'
import { useFocusTrap } from '../../../common/hooks/useFocusTrap'
import styles from './CatalogDialog.module.css'

export interface CatalogDialogProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Modal panel for the catalog form and the delete confirmation: focus stays inside, Escape closes
 * and focus returns to the control that opened it. Mounted only while open.
 */
export function CatalogDialog({ title, onClose, children }: CatalogDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useFocusTrap(panelRef, true, onClose)

  return (
    <div className={styles.backdrop}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className={styles.panel}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
