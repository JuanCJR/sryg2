import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical, type LucideIcon } from 'lucide-react'
import { Icon } from '../Icon/Icon'
import { IconButton } from '../IconButton/IconButton'
import clsx from '../../utils/clsx'
import styles from './ActionMenu.module.css'

export interface ActionMenuItem {
  label: string
  onSelect: () => void
  icon?: LucideIcon
  /** Destructive actions (delete, deactivate) are set apart at the end of the list. */
  danger?: boolean
  disabled?: boolean
}

export interface ActionMenuProps {
  /** Accessible name of the trigger, naming the row: "Acciones de Ana Pérez". */
  label: string
  items: readonly ActionMenuItem[]
  /** Shows a busy trigger (an action of this row is in flight). */
  busy?: boolean
  className?: string
}

interface Position {
  top: number
  left: number
  /** The menu opens upwards when there is no room below the trigger. */
  above: boolean
}

const GAP = 4

/**
 * The row-actions menu of every table: a "⋮" trigger that opens a menu of the row's actions
 * (WAI-ARIA menu button). Arrow keys move, Home/End jump, Escape closes and returns focus to the
 * trigger. The menu is portalled and fixed, so a scrolling table frame never clips it.
 */
export function ActionMenu({ label, items, busy = false, className }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const menuId = useId()
  const enabled = items.filter((item) => !item.disabled)

  const close = useCallback((focusTrigger: boolean) => {
    setOpen(false)
    if (focusTrigger) triggerRef.current?.focus()
  }, [])

  const place = useCallback(() => {
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return
    const rect = trigger.getBoundingClientRect()
    const height = menu.offsetHeight
    const width = menu.offsetWidth
    const above = rect.bottom + GAP + height > window.innerHeight && rect.top - GAP - height > 0
    setPosition({
      top: above ? rect.top - GAP - height : rect.bottom + GAP,
      left: Math.max(GAP, Math.min(rect.right - width, window.innerWidth - width - GAP)),
      above,
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    place()
    const first = menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')
    first?.focus()
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false)
    }
    const onViewport = () => close(false)
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('resize', onViewport)
    window.addEventListener('scroll', onViewport, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('resize', onViewport)
      window.removeEventListener('scroll', onViewport, true)
    }
  }, [open, close])

  const focusItem = (move: (index: number, count: number) => number) => {
    const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
    if (buttons.length === 0) return
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    buttons[move(current, buttons.length)]?.focus()
  }

  const handleMenuKey = (event: KeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusItem((i, n) => (i + 1) % n)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusItem((i, n) => (i <= 0 ? n - 1 : i - 1))
        break
      case 'Home':
        event.preventDefault()
        focusItem(() => 0)
        break
      case 'End':
        event.preventDefault()
        focusItem((_, n) => n - 1)
        break
      case 'Escape':
        event.preventDefault()
        close(true)
        break
      case 'Tab':
        close(false)
        break
    }
  }

  const ordered = [...items.filter((item) => !item.danger), ...items.filter((item) => item.danger)]
  const firstDanger = ordered.findIndex((item) => item.danger)

  return (
    <>
      <IconButton
        ref={triggerRef}
        icon={MoreVertical}
        variant="ghost"
        iconSize={20}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-busy={busy || undefined}
        disabled={busy || enabled.length === 0}
        className={clsx(styles.trigger, open && styles.triggerOpen, className)}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      />
      {open
        ? createPortal(
            <ul
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              className={clsx(styles.menu, position?.above && styles.above)}
              style={position ? { top: position.top, left: position.left } : { visibility: 'hidden' }}
              onKeyDown={handleMenuKey}
            >
              {ordered.map((item, index) => (
                <li
                  key={item.label}
                  role="none"
                  className={clsx(index === firstDanger && index > 0 && styles.separated)}
                >
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    disabled={item.disabled}
                    className={clsx(styles.item, item.danger && styles.danger)}
                    onClick={() => {
                      close(true)
                      item.onSelect()
                    }}
                  >
                    {item.icon ? <Icon icon={item.icon} size={16} /> : null}
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </>
  )
}
