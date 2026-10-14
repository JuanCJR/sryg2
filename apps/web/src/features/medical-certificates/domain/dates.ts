const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 86_400_000

const pad = (n: number) => String(n).padStart(2, '0')

/** "10 mar 2027" for a `YYYY-MM-DD` day; "—" while the value is empty or partial. */
export function formatDay(iso: string): string {
  const match = ISO_DATE.exec(iso)
  if (!match) return '—'
  const [, y, m, d] = match
  return `${d} ${MONTHS[Number(m) - 1] ?? '—'} ${y}`
}

/** "01 sep 2026 · 15:30" (UTC), like the rest of the audit figures. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return `${formatDay(date.toISOString().slice(0, 10))} · ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

/** Today in the operator's calendar, `YYYY-MM-DD`: the default issue date of the form. */
export function localToday(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export const isIsoDay = (value: string) => ISO_DATE.test(value) && !Number.isNaN(Date.parse(value))

/** Whole days from `today` to `expiry` (negative once expired). */
export function daysUntil(expiry: string, today: string): number {
  return Math.round((Date.parse(expiry) - Date.parse(today)) / DAY_MS)
}

/** "−12 d" / "21 d" — flush-right remaining-days figure, as in the other condition tables. */
export const formatRemaining = (days: number) => (days < 0 ? `−${Math.abs(days)} d` : `${days} d`)
