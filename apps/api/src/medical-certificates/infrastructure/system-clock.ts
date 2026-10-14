import type { Clock } from '../domain/clock'

/** The UTC calendar day, as `deriveCredentialStatus` counts days. */
export class SystemClock implements Clock {
  today(): string {
    return new Date().toISOString().slice(0, 10)
  }
}
