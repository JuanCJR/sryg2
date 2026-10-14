const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** "26 sep 2026" — used for every date figure in the expediente (mono). */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = MONTHS[date.getUTCMonth()]
  const year = date.getUTCFullYear()
  return `${day} ${month} ${year}`
}

/** "26 sep 2026 · 14:05" — used for the audit trail and the identity audit line. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${formatDate(iso)} · ${hours}:${minutes}`
}

/** "−12 d" / "21 d" / "1185 d" — flush-right remaining-days figure. */
export function formatRemaining(days: number): string {
  return days < 0 ? `−${Math.abs(days)} d` : `${days} d`
}
