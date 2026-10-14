import type { CredentialStatus } from '../../../design-system'
import { DEMO_NEAR_EXPIRY_DAYS } from './config'

const MS_PER_DAY = 1000 * 60 * 60 * 24

function atMidnightUtc(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/** Whole days between `today` and the ISO date (negative if the date is in the past). */
export function daysUntil(iso: string, today: Date): number {
  return Math.round((atMidnightUtc(new Date(iso)) - atMidnightUtc(today)) / MS_PER_DAY)
}

/** A credential's own status from its expiry alone — never affected by a block. */
export function deriveOwnStatus(vence: string, today: Date, nearExpiryDays = DEMO_NEAR_EXPIRY_DAYS): CredentialStatus {
  const remaining = daysUntil(vence, today)
  if (remaining < 0) {
    return 'vencida'
  }
  if (remaining <= nearExpiryDays) {
    return 'proxima'
  }
  return 'activa'
}
