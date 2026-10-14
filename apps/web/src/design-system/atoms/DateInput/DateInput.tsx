import { forwardRef, useEffect, useState, type ChangeEvent, type InputHTMLAttributes } from 'react'
import inputStyles from '../Input/Input.module.css'
import clsx from '../../utils/clsx'

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
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { className, value, onChange, ...rest },
  ref,
) {
  const [text, setText] = useState(() => isoToDisplay(value))

  // Re-syncs the displayed text whenever the controlled ISO value changes externally (a reset,
  // a different row's own default, or the parent clearing the field for validation).
  useEffect(() => {
    setText(isoToDisplay(value))
  }, [value])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 8)
    const nextText = formatDigits(digits)
    setText(nextText)
    onChange?.({ target: { value: displayToIso(nextText) } } as ChangeEvent<HTMLInputElement>)
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="dd/mm/aaaa"
      className={clsx(inputStyles.control, inputStyles.mono, className)}
      value={text}
      onChange={handleChange}
      {...rest}
    />
  )
})
