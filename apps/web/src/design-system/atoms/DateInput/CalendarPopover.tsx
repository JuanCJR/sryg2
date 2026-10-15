import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '../IconButton/IconButton'
import clsx from '../../utils/clsx'
import styles from './DateInput.module.css'

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

// es-VE weeks start on Monday.
const WEEKDAYS = [
  { short: 'Lu', long: 'lunes' },
  { short: 'Ma', long: 'martes' },
  { short: 'Mi', long: 'miércoles' },
  { short: 'Ju', long: 'jueves' },
  { short: 'Vi', long: 'viernes' },
  { short: 'Sá', long: 'sábado' },
  { short: 'Do', long: 'domingo' },
] as const

/** A calendar day without time or time zone — the calendar never touches `Date` offsets. */
interface Day {
  year: number
  month: number // 0-11
  day: number
}

const pad = (value: number) => String(value).padStart(2, '0')
const dayToIso = (d: Day) => `${d.year}-${pad(d.month + 1)}-${pad(d.day)}`

function isoToDay(iso: string | undefined): Day | null {
  const match = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) }
}

function todayDay(): Day {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() }
}

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

function shift(d: Day, days: number): Day {
  const date = new Date(Date.UTC(d.year, d.month, d.day + days))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() }
}

function shiftMonths(d: Day, months: number): Day {
  const index = d.year * 12 + d.month + months
  const year = Math.floor(index / 12)
  const month = index - year * 12
  return { year, month, day: Math.min(d.day, daysInMonth(year, month)) }
}

/** Monday-first column of a day (0 = lunes). */
const weekdayIndex = (d: Day) => (new Date(Date.UTC(d.year, d.month, d.day)).getUTCDay() + 6) % 7

const sameDay = (a: Day | null, b: Day | null) =>
  a !== null && b !== null && a.year === b.year && a.month === b.month && a.day === b.day

const longLabel = (d: Day) => `${WEEKDAYS[weekdayIndex(d)]!.long} ${d.day} de ${MONTHS[d.month]} de ${d.year}`

export interface CalendarPopoverProps {
  /** ISO `YYYY-MM-DD` currently in the field, if any. */
  value: string
  min?: string
  max?: string
  onSelect: (iso: string) => void
  onClear: () => void
  onClose: () => void
  id: string
}

/** The month grid behind `DateInput`'s calendar button (APG date-picker dialog pattern). */
export function CalendarPopover({ value, min, max, onSelect, onClear, onClose, id }: CalendarPopoverProps) {
  const selected = isoToDay(value)
  const today = todayDay()
  const [focused, setFocused] = useState<Day>(() => selected ?? today)
  const gridRef = useRef<HTMLTableElement>(null)
  // Focus follows the roving day on open and on grid keys — never while a month/year select is in use.
  const focusGrid = useRef(true)
  const minIso = min ?? ''
  const maxIso = max ?? ''

  const outOfRange = (d: Day) => {
    const iso = dayToIso(d)
    return (minIso !== '' && iso < minIso) || (maxIso !== '' && iso > maxIso)
  }

  // Keep DOM focus on the roving day as it moves.
  useEffect(() => {
    if (!focusGrid.current) return
    focusGrid.current = false
    gridRef.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus()
  }, [focused])

  const firstOfMonth: Day = { year: focused.year, month: focused.month, day: 1 }
  const leading = weekdayIndex(firstOfMonth)
  const cells: Day[] = Array.from({ length: 42 }, (_, index) => shift(firstOfMonth, index - leading))
  const weeks = Array.from({ length: 6 }, (_, week) => cells.slice(week * 7, week * 7 + 7))
  const thisYear = today.year
  const years = Array.from({ length: thisYear + 30 - 1930 + 1 }, (_, index) => 1930 + index)
  if (!years.includes(focused.year)) years.push(focused.year)

  const handleKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const moves: Record<string, () => Day> = {
      ArrowLeft: () => shift(focused, -1),
      ArrowRight: () => shift(focused, 1),
      ArrowUp: () => shift(focused, -7),
      ArrowDown: () => shift(focused, 7),
      Home: () => shift(focused, -weekdayIndex(focused)),
      End: () => shift(focused, 6 - weekdayIndex(focused)),
      PageUp: () => shiftMonths(focused, event.shiftKey ? -12 : -1),
      PageDown: () => shiftMonths(focused, event.shiftKey ? 12 : 1),
    }
    const move = moves[event.key]
    if (move) {
      event.preventDefault()
      focusGrid.current = true
      setFocused(move())
    }
  }

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="false"
      aria-label="Elegir fecha"
      className={styles.popover}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <div className={styles.calHeader}>
        <IconButton
          icon={ChevronLeft}
          iconSize={16}
          variant="ghost"
          aria-label="Mes anterior"
          onClick={() => setFocused(shiftMonths(focused, -1))}
        />
        <div className={styles.calTitle}>
          <select
            aria-label="Mes"
            className={styles.calSelect}
            value={focused.month}
            onChange={(event) => setFocused(shiftMonths(focused, Number(event.target.value) - focused.month))}
          >
            {MONTHS.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Año"
            className={clsx(styles.calSelect, styles.calYear)}
            value={focused.year}
            onChange={(event) => setFocused(shiftMonths(focused, (Number(event.target.value) - focused.year) * 12))}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <IconButton
          icon={ChevronRight}
          iconSize={16}
          variant="ghost"
          aria-label="Mes siguiente"
          onClick={() => setFocused(shiftMonths(focused, 1))}
        />
      </div>

      <table ref={gridRef} role="grid" className={styles.grid} onKeyDown={handleKeyDown}>
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th key={weekday.short} scope="col" abbr={weekday.long} className={styles.weekday}>
                {weekday.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={dayToIso(week[0]!)}>
              {week.map((day) => {
                const inMonth = day.month === focused.month
                const isSelected = sameDay(day, selected)
                const disabled = outOfRange(day)
                return (
                  <td key={dayToIso(day)} role="gridcell" aria-selected={isSelected || undefined}>
                    <button
                      type="button"
                      tabIndex={sameDay(day, focused) ? 0 : -1}
                      aria-label={longLabel(day)}
                      aria-current={sameDay(day, today) ? 'date' : undefined}
                      disabled={disabled}
                      className={clsx(
                        styles.day,
                        !inMonth && styles.dayOutside,
                        isSelected && styles.daySelected,
                        sameDay(day, today) && styles.dayToday,
                      )}
                      onClick={() => onSelect(dayToIso(day))}
                    >
                      {day.day}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.calFooter}>
        <button type="button" className={styles.calLink} onClick={onClear}>
          Limpiar
        </button>
        <button
          type="button"
          className={styles.calLink}
          disabled={outOfRange(today)}
          onClick={() => onSelect(dayToIso(today))}
        >
          Hoy
        </button>
      </div>
    </div>
  )
}
