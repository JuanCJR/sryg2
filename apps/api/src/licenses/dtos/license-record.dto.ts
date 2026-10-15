import type { Rav67Class } from '@sryg/types'

export interface PersonRef {
  id: string
  /** Document number: the default license number (D22). */
  cedula: string
}

export interface LicenseTypeInfo {
  id: string
  nameEs: string
  requiredMedicalClass: Rav67Class | null
  active: boolean
}

/** Catalogs a license write references, besides the license type. */
export type LicenseCatalog = 'license-observations' | 'type-ratings' | 'functions' | 'class-ratings' | 'aircraft'

export interface LicenseRecord {
  id: string
  personalId: string
  licenseTypeId: string
  number: string
  issueDate: string
  expiryDate: string | null
  observationIds: string[]
}

export type LicenseFields = Pick<LicenseRecord, 'number' | 'issueDate' | 'expiryDate'>

export interface TypeRatingRecord {
  id: string
  licenseId: string
  typeRatingId: string
  functionId: string
  expiryDate: string
}

export interface ClassRatingRecord {
  id: string
  licenseId: string
  classRatingId: string
  aircraftIds: string[]
  expiryDate: string
}
