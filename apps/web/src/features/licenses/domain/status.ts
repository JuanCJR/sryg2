import type { DerivedCredentialStatus } from '@sryg/types'
import type { CredentialStatus } from '../../../design-system'

const LAMP: Record<DerivedCredentialStatus, CredentialStatus> = {
  vigente: 'activa',
  proxima_a_vencer: 'proxima',
  vencida: 'vencida',
  bloqueada: 'bloqueada',
}

/** The API's derived status (D17) as the design system's lamp. */
export function toCredentialStatus(status: DerivedCredentialStatus): CredentialStatus {
  return LAMP[status]
}
