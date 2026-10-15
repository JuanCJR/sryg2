import type { DerivedCredentialStatus, PublicVerification, Rav67Class } from '@sryg/types'
import { BLOCKED_STATE_LABEL, type CredentialStatus } from '../../../common/components'

export type CredentialKind = 'license' | 'medical'

/** One card the user may print from the Expediente (D7). */
export interface PrintableCredential {
  kind: CredentialKind
  id: string
  number: string
  /** License type, or the RAV 67 class of the certificate. */
  description: string
  expiryDate: string | null
  status: DerivedCredentialStatus
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** `YYYY-MM-DD` as "10 feb 2028", like the other Expediente pages; null when it does not expire. */
export function formatDate(iso: string | null): string {
  if (!iso) return 'No vence'
  const [year, month, day] = iso.split('-')
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`
}

export const KIND_LABEL: Record<CredentialKind, string> = { license: 'Licencia', medical: 'Certificado médico' }

export const VERIFICATION_KIND_LABEL: Record<PublicVerification['kind'], string> = {
  licencia: 'Licencia',
  certificado_medico: 'Certificado médico',
}

export const MEDICAL_CLASS_LABEL: Record<Rav67Class, string> = {
  clase_1: 'Primera clase',
  clase_2: 'Segunda clase',
  clase_3: 'Tercera clase',
}

/** The statuses D9 shows to the public, and the lamp each one lights. */
export const VERIFICATION_STATUS: Record<PublicVerification['status'], { label: string; lamp: CredentialStatus }> = {
  vigente: { label: 'Vigente', lamp: 'activa' },
  vencida: { label: 'Vencida', lamp: 'vencida' },
  bloqueada: { label: BLOCKED_STATE_LABEL, lamp: 'bloqueada' },
}

export const STATUS_LABEL: Record<DerivedCredentialStatus, string> = {
  vigente: 'Vigente',
  proxima_a_vencer: 'Próxima a vencer',
  vencida: 'Vencida',
  bloqueada: BLOCKED_STATE_LABEL,
}

/** The API refuses expired and blocked cards (409); near expiry still prints. */
export const canPrint = (status: DerivedCredentialStatus) => status === 'vigente' || status === 'proxima_a_vencer'

/** Identifies a card among the person's licenses and certificates. */
export const credentialKey = (credential: Pick<PrintableCredential, 'kind' | 'id'>) =>
  `${credential.kind}:${credential.id}`
