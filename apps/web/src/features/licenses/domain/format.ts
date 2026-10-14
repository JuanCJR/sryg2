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
