import type { CredentialStatus } from '../../../design-system'

export interface LicenseFormPerson {
  id: string
  cedula: string
  nombre: string
  categoria: string
}

export interface LicenseFormLicense {
  id: string
  categoria: string
  numero: string
  /** ISO date. Status ignoring any open block. */
  estadoActual: CredentialStatus
  venceActual: string
}

export interface LicenseFormRating {
  id: string
  nombre: string
  estadoActual: CredentialStatus
  /** ISO date. */
  venceActual: string
}

export interface LicenseFormBlock {
  id: string
  motivo: string
  /** ISO date. */
  registradoEn: string
}

export interface LicenseFormData {
  person: LicenseFormPerson
  license: LicenseFormLicense
  /** Ratings that depend on `license` — one trámite covers the license plus these together. */
  ratings: LicenseFormRating[]
  /** Present only while an open block impedes issuance. */
  block?: LicenseFormBlock
}
