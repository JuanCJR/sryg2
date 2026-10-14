import { useRef, type KeyboardEvent } from 'react'
import { Lamp, type LampStatus } from '../../atoms/Lamp/Lamp'
import clsx from '../../utils/clsx'
import { getPageKeyDomIds } from './pageKeyIds'
import styles from './PageKeys.module.css'

export interface PageKeyItem {
  id: string
  label: string
  /** Present when this page contains an open problem; sets the mini lamp's status. */
  problem?: LampStatus
}

export interface PageKeysProps {
  items: PageKeyItem[]
  activeId: string
  onChange: (id: string) => void
  /** Namespaces the tab/panel DOM ids this instance generates — required so two PageKeys on one page never collide. */
  idPrefix: string
  'aria-label': string
  className?: string
}

/** The ECAM page-key row: accessible tabs with roving tabindex. */
export function PageKeys({ items, activeId, onChange, idPrefix, 'aria-label': ariaLabel, className }: PageKeysProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const hasActive = items.some((item) => item.id === activeId)

  const focusAndSelect = (index: number) => {
    const item = items[index]
    if (!item) {
      return
    }
    refs.current[index]?.focus()
    onChange(item.id)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        focusAndSelect((index + 1) % items.length)
        break
      case 'ArrowLeft':
        event.preventDefault()
        focusAndSelect((index - 1 + items.length) % items.length)
        break
      case 'Home':
        event.preventDefault()
        focusAndSelect(0)
        break
      case 'End':
        event.preventDefault()
        focusAndSelect(items.length - 1)
        break
      default:
        break
    }
  }

  return (
    <div role="tablist" aria-label={ariaLabel} className={clsx(styles.list, className)}>
      {items.map((item, index) => {
        const selected = item.id === activeId
        // If nothing matches activeId, the first key still owns the roving tab stop so the row stays keyboard-reachable.
        const isTabStop = selected || (!hasActive && index === 0)
        const { tabId, panelId } = getPageKeyDomIds(idPrefix, item.id)
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[index] = el
            }}
            role="tab"
            type="button"
            id={tabId}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={isTabStop ? 0 : -1}
            className={styles.key}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {item.problem ? <Lamp status={item.problem} size="sm" /> : null}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
