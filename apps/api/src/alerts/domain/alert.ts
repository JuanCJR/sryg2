import { type AlertKind, type CredentialKind, deriveCredentialStatus } from '@sryg/types'

export const ALERT_ENTITY = 'alerta'

/** The user performing a mutation; access was already checked by the permission guard. */
export interface Actor {
  id: string
}

/** A credential with an expiry date, as read for the recalculation. */
export interface ExpiringCredential {
  personalId: string
  credentialKind: CredentialKind
  credentialId: string
  /** `YYYY-MM-DD`. */
  expiryDate: string
}

/** An alert the table must hold after a recalculation; unique by (credentialId, kind). */
export interface DesiredAlert {
  personalId: string
  credentialKind: CredentialKind
  credentialId: string
  kind: AlertKind
  dueDate: string
}

/**
 * Alert raised by a credential (BR-12): `vencida` once expired, `proxima` while it is near expiry
 * per the configured threshold, none otherwise. Blocks are ignored: an alert is about the date.
 */
export function alertKindFor(expiryDate: string | null, today: string, thresholdDays: number): AlertKind | null {
  const status = deriveCredentialStatus(expiryDate, today, thresholdDays, false)
  if (status === 'vencida') return 'vencida'
  if (status === 'proxima_a_vencer') return 'proxima'
  return null
}

export function desiredAlerts(
  credentials: readonly ExpiringCredential[],
  today: string,
  thresholdDays: number,
): DesiredAlert[] {
  const result: DesiredAlert[] = []
  for (const { expiryDate, ...credential } of credentials) {
    const kind = alertKindFor(expiryDate, today, thresholdDays)
    if (kind) result.push({ ...credential, kind, dueDate: expiryDate })
  }
  return result
}
