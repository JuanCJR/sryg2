import type { CatalogOption, Rav67Class } from '@sryg/types'
import { DomainError } from '../../common/errors/domain-errors'

export const MEDICAL_CERTIFICATE_ENTITY = 'certificado_medico'

/** The user performing a mutation; access was already checked by the permission guard. */
export interface Actor {
  id: string
}

/** Administrative data only: class, number, dates, observations and restrictions (BR-05, D8). */
export interface MedicalCertificate {
  id: string
  personalId: string
  rav67Class: Rav67Class
  number: string
  /** `YYYY-MM-DD`. */
  issueDate: string
  /** `YYYY-MM-DD`, derived from the class validity (D3). */
  expiryDate: string
  restrictions: string | null
  observations: CatalogOption[]
  createdAt: Date
  updatedAt: Date
}

export interface NewMedicalCertificate {
  personalId: string
  rav67Class: Rav67Class
  number: string
  issueDate: string
  expiryDate: string
  restrictions: string | null
  observationIds: string[]
}

export type MedicalCertificateRenewal = Omit<NewMedicalCertificate, 'personalId' | 'rav67Class'>

/** The fields an audit row snapshots: what a registration sets and a renewal may change. */
export function auditSnapshot(certificate: MedicalCertificate | NewMedicalCertificate) {
  return {
    rav67Class: certificate.rav67Class,
    number: certificate.number,
    issueDate: certificate.issueDate,
    expiryDate: certificate.expiryDate,
    restrictions: certificate.restrictions,
    observationIds:
      'observationIds' in certificate ? certificate.observationIds : certificate.observations.map((o) => o.id),
  }
}

/** An observation id that is not in the catalog, or is inactive and was not already on the certificate. */
export class InvalidObservationError extends DomainError {}
