import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from 'react'
import clsx from '../../utils/clsx'
import styles from './Tooltip.module.css'

export interface TooltipProps {
  content: string
  children: ReactElement
}

type TriggerProps = {
  'aria-describedby'?: string
  onMouseEnter?: (event: MouseEvent) => void
  onMouseLeave?: (event: MouseEvent) => void
  onFocus?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
  onKeyDown?: (event: KeyboardEvent) => void
}

function chain<E>(existing: ((event: E) => void) | undefined, next: (event: E) => void) {
  return (event: E) => {
    existing?.(event)
    next(event)
  }
}

/** Wraps a single focusable/hoverable trigger and describes it accessibly. */
export function Tooltip({ content, children }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const id = useId()

  const show = () => setOpen(true)
  const hide = () => setOpen(false)

  const isElement = isValidElement<TriggerProps>(children)
  const childProps = isElement ? children.props : undefined
  const describedBy = [childProps?.['aria-describedby'], id].filter(Boolean).join(' ')

  const trigger = isElement
    ? cloneElement(children, {
        'aria-describedby': describedBy,
        onMouseEnter: chain(childProps?.onMouseEnter, show),
        onMouseLeave: chain(childProps?.onMouseLeave, hide),
        onFocus: chain(childProps?.onFocus, show),
        onBlur: chain(childProps?.onBlur, hide),
        onKeyDown: chain<KeyboardEvent>(childProps?.onKeyDown, (event) => {
          if (event.key === 'Escape') {
            hide()
          }
        }),
      })
    : children

  return (
    <span className={styles.wrapper}>
      {trigger}
      {/* Always mounted (visually hidden when closed) so the describedby target always exists for assistive tech. */}
      <span role="tooltip" id={id} className={clsx(styles.bubble, !open && styles.hidden)}>
        {content}
      </span>
    </span>
  )
}
