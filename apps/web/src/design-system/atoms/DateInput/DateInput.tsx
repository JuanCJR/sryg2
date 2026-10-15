import { forwardRef, useEffect, useId, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { Icon } from '../Icon/Icon'
import inputStyles from '../Input/Input.module.css'
import clsx from '../../utils/clsx'
import { CalendarPopover } from './CalendarPopover'
import styles from './DateInput.module.css'

export interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  /** ISO `YYYY-MM-DD` (a leading date-only slice of a full ISO datetime also works). Empty or `undefined` clears the field. */
  value?: string
  /**
   * Fires on every keystroke. `event.target.value` carries ISO `YYYY-MM-DD` once the typed text
   * resolves to a complete, real calendar date, or `''` while it is still incomplete or
   * impossible (e.g. `31/02`) — the same empty-until-resolved contract a native `type="date"`
   * input already has. Only `target.value` is guaranteed on the forwarded event.
   */
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}

function isoToDisplay(iso: string | undefined): string {
  const match = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null
  if (!match) {
    return ''
  }
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

/** Re-inserts the `/` separators as digits accumulate (dd/mm/aaaa), capped at 8 digits. */
function formatDigits(digits: string): string {
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/')
}

/** `''` for anything incomplete or calendar-invalid (e.g. 31/02) — never a miscounted date. */
function displayToIso(display: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display)
  if (!match) {
    return ''
  }
  const [, dd, mm, yyyy] = match
  const day = Number(dd)
  const month = Number(mm)
  const year = Number(yyyy)
  const date = new Date(Date.UTC(year, month - 1, day))
  const isRealCalendarDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return isRealCalendarDate ? `${yyyy}-${mm}-${dd}` : ''
}

/**
 * A native `type="date"` input's displayed digit order follows the browser's own UI locale (for
 * example `mm/dd/yyyy` on an `en-US` browser) — there is no standards-based way to override that
 * per element, which is wrong for an es-VE product. This atom is a masked `dd/mm/aaaa` text field
 * instead: the digit order is fixed regardless of browser locale, the value contract is
 * unchanged (`value`/`onChange.target.value` are still a plain ISO `YYYY-MM-DD` string, so no
 * caller needs to change), it stays fully keyboard-typable (digits only; `/` separators insert
 * automatically), and label/hint/error wiring through `FormField` is untouched.
 *
 * A calendar button opens a Monday-first month grid (arrow keys, PageUp/PageDown for months,
 * month/year selects for far dates such as a birth date, "Hoy" and "Limpiar"), and a clear
 * button empties a filled field. `min`/`max` (ISO) disable the days outside the range.
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { className, value, onChange, disabled, readOnly, min, max, ...rest },
  ref,
) {
  const [text, setText] = useState(() => isoToDisplay(value))
  const [open, setOpen] = useState(false)
  const popoverId = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Re-syncs the displayed text whenever the controlled ISO value changes externally (a reset,
  // a different row's own default, or the parent clearing the field for validation).
  useEffect(() => {
    setText(isoToDisplay(value))
  }, [value])

  // A click anywhere outside the field and its calendar closes the calendar.
  useEffect(() => {
    if (!open) return
    const handlePointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    return () => document.removeEventListener('mousedown', handlePointer)
  }, [open])

  const emit = (iso: string) => {
    onChange?.({ target: { value: iso } } as ChangeEvent<HTMLInputElement>)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 8)
    const nextText = formatDigits(digits)
    setText(nextText)
    emit(displayToIso(nextText))
  }

  const closeAndReturn = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const pick = (iso: string) => {
    setText(isoToDisplay(iso))
    emit(iso)
    closeAndReturn()
  }

  const clear = () => {
    setText('')
    emit('')
  }

  const interactive = !disabled && !readOnly

  return (
    <span ref={wrapRef} className={styles.wrap}>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        className={clsx(inputStyles.control, inputStyles.mono, styles.input, className)}
        value={text}
        onChange={handleChange}
        disabled={disabled}
        readOnly={readOnly}
        {...rest}
      />
      <span className={styles.adornments}>
        {interactive && text !== '' ? (
          <button type="button" className={styles.adornment} aria-label="Borrar fecha" onClick={clear}>
            <Icon icon={X} size={16} />
          </button>
        ) : null}
        <button
          ref={triggerRef}
          type="button"
          className={styles.adornment}
          aria-label="Abrir calendario"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          disabled={!interactive}
          onClick={() => setOpen((current) => !current)}
        >
          <Icon icon={CalendarDays} size={16} />
        </button>
      </span>
      {open ? (
        <CalendarPopover
          id={popoverId}
          value={value ?? ''}
          min={min === undefined ? undefined : String(min)}
          max={max === undefined ? undefined : String(max)}
          onSelect={pick}
          onClear={() => {
            clear()
            closeAndReturn()
          }}
          onClose={closeAndReturn}
        />
      ) : null}
    </span>
  )
})
