/** Calendar day (UTC) of `date`, `YYYY-MM-DD`: the same day `deriveCredentialStatus` reads from a Date. */
export const isoDay = (date: Date): string => date.toISOString().slice(0, 10)

/** `YYYY-MM-DD` plus `days` calendar days. */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return isoDay(date)
}

/** Source of "now", injected so the rules that depend on the date stay testable. */
export class Clock {
  now(): Date {
    return new Date()
  }

  /** Today's calendar day in UTC, `YYYY-MM-DD`, the same day `deriveCredentialStatus` uses. */
  today(): string {
    return isoDay(this.now())
  }
}
