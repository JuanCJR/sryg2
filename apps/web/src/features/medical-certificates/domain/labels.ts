import type { AuditAction, DerivedCredentialStatus, MedicalCertificateDto, Rav67Class } from '@sryg/types'
import type { CredentialStatus } from '../../../design-system'

/** As printed on the credential (§4 of the plan): PRIMERA / SEGUNDA / TERCERA CLASE. */
export const CLASS_LABEL: Record<Rav67Class, string> = {
  clase_1: 'Primera clase',
  clase_2: 'Segunda clase',
  clase_3: 'Tercera clase',
}

/** The design system's status vocabulary for the status the API derives (D17). */
export const STATUS_TO_BADGE: Record<DerivedCredentialStatus, CredentialStatus> = {
  vigente: 'activa',
  proxima_a_vencer: 'proxima',
  vencida: 'vencida',
  bloqueada: 'bloqueada',
}

const HISTORY_ACTION_LABEL: Partial<Record<AuditAction, string>> = {
  emitir: 'Registro',
  renovar: 'Renovación',
}

export const historyActionLabel = (action: AuditAction) => HISTORY_ACTION_LABEL[action] ?? action

/** "Segunda clase · Nº 00000202" — how a certificate is named in tables, radios and history toggles. */
export const certificateName = (c: Pick<MedicalCertificateDto, 'rav67Class' | 'number'>) =>
  `${CLASS_LABEL[c.rav67Class]} · Nº ${c.number}`

export const BLOCKED_TITLE = 'Bloqueo activo · registro y renovación impedidos'
export const NO_CLINICAL_DATA_TITLE = 'Este sistema no almacena datos clínicos'
