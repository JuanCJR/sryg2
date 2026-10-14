const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * "26 sep 2026" — same shape as every other date figure in the system (mono where applicable).
 * An empty or unparseable value (e.g. a date field left blank before submit) renders "—" rather
 * than "NaN undefined NaN", since the summary rail reads this while the operator is still typing.
 */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (!iso || Number.isNaN(date.getTime())) {
    return '—'
  }
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = MONTHS[date.getUTCMonth()]
  const year = date.getUTCFullYear()
  return `${day} ${month} ${year}`
}

/** "26 sep 2026 · 14:05" — the audit trail's figure. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${formatDate(iso)} · ${hours}:${minutes}`
}

/** A license whose type does not apply expiry (D20). */
export const NO_EXPIRY_LABEL = 'Sin vencimiento'

export function formatExpiry(iso: string | null): string {
  return iso === null ? NO_EXPIRY_LABEL : formatDate(iso)
}

/** Today as `YYYY-MM-DD` (UTC, the day the API derives statuses with). */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

const DAY_MS = 86_400_000

/** "−12 d" / "21 d" until `iso` from `today`; "—" without expiry. */
export function formatRemaining(iso: string | null, today: string): string {
  if (iso === null) return '—'
  const days = Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS)
  return days < 0 ? `−${Math.abs(days)} d` : `${days} d`
}
