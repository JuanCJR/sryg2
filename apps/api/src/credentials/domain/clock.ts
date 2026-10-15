/** Today's date as `YYYY-MM-DD`; injected so the validity check stays testable. */
export interface Clock {
  today(): string
}

/** The calendar day in UTC, the same day `deriveCredentialStatus` uses. */
export class SystemClock implements Clock {
  today(): string {
    return new Date().toISOString().slice(0, 10)
  }
}
