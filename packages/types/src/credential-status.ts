import type { DerivedCredentialStatus } from './enums'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 86_400_000

/** Day number (UTC) of a `YYYY-MM-DD` string or of the calendar day of a Date (UTC). */
function toDay(value: string | Date): number {
  if (value instanceof Date) return Math.floor(value.getTime() / DAY_MS)
  const match = ISO_DATE.exec(value)
  if (!match) throw new RangeError(`Invalid date: ${value}`)
  const [, y, m, d] = match
  return Date.UTC(Number(y), Number(m) - 1, Number(d)) / DAY_MS
}

/**
 * Status of a credential (D17, BR-12, BR-14). An active block wins over any date; a credential
 * without expiry (D20) is vigente; it is vencida from the day after its expiry date, and
 * proxima_a_vencer while `thresholdDays` or fewer days remain until it.
 */
export function deriveCredentialStatus(
  expiryDate: string | Date | null,
  today: string | Date,
  thresholdDays: number,
  hasActiveBlock: boolean,
): DerivedCredentialStatus {
  if (!Number.isInteger(thresholdDays) || thresholdDays < 0) throw new RangeError(`Invalid threshold: ${thresholdDays}`)
  const todayDay = toDay(today)
  if (hasActiveBlock) return 'bloqueada'
  if (expiryDate === null) return 'vigente'
  const remaining = toDay(expiryDate) - todayDay
  if (remaining < 0) return 'vencida'
  return remaining <= thresholdDays ? 'proxima_a_vencer' : 'vigente'
}
