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

/** Reads and writes of a license trámite, bound to one transaction by the unit of work. */
export interface LicenseStore {
  findPerson(id: string): Promise<PersonRef | null>
  findLicenseType(id: string): Promise<LicenseTypeInfo | null>
  /** A certificate of `rav67Class` that expires on `today` or later (D13). */
  hasValidMedicalCertificate(personalId: string, rav67Class: Rav67Class, today: string): Promise<boolean>
  /** The subset of `ids` that exists in `catalog` and is active. */
  activeCatalogIds(catalog: LicenseCatalog, ids: readonly string[]): Promise<Set<string>>

  /** Locks the row for the rest of the transaction, so concurrent trámites serialize (NFR-09). */
  findLicense(id: string): Promise<LicenseRecord | null>
  insertLicense(data: { personalId: string; licenseTypeId: string } & LicenseFields): Promise<string>
  updateLicense(id: string, data: LicenseFields): Promise<void>
  setObservations(licenseId: string, observationIds: readonly string[]): Promise<void>

  findTypeRating(id: string): Promise<TypeRatingRecord | null>
  insertTypeRating(data: Omit<TypeRatingRecord, 'id'>): Promise<TypeRatingRecord>
  updateTypeRatingExpiry(id: string, expiryDate: string): Promise<void>
  deleteTypeRating(id: string): Promise<void>

  findClassRating(id: string): Promise<ClassRatingRecord | null>
  insertClassRating(data: Omit<ClassRatingRecord, 'id'>): Promise<ClassRatingRecord>
  updateClassRatingExpiry(id: string, expiryDate: string): Promise<void>
  deleteClassRating(id: string): Promise<void>
}
