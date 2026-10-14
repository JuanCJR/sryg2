import type { BlockType, Rav60Category, Rav67Class } from '@sryg/types'

export interface PersonRecord {
  id: string
  cedula: string
  firstNames: string
  lastNames: string
}

export interface LicenseRecord {
  id: string
  personalId: string
  licenseTypeId: string
  licenseTypeName: string
  rav60Category: Rav60Category
  number: string
  issueDate: string
  /** Null when the license type does not expire (D20). */
  expiryDate: string | null
  createdAt: Date
}

export interface TypeRatingRecord {
  id: string
  licenciaId: string
  typeRatingId: string
  typeRatingName: string
  functionName: string
  expiryDate: string
  createdAt: Date
}

export interface ClassRatingRecord {
  id: string
  licenciaId: string
  classRatingId: string
  classRatingName: string
  expiryDate: string
  createdAt: Date
}

export interface MedicalRecord {
  id: string
  personalId: string
  rav67Class: Rav67Class
  number: string
  issueDate: string
  expiryDate: string
  createdAt: Date
}

export interface ActiveBlockRecord {
  id: string
  personalId: string
  type: BlockType
  reason: string
  createdAt: Date
  createdByName: string
}

/** Everything the three reports read, for the people matching the text search. */
export interface ReportDataset {
  people: PersonRecord[]
  licenses: LicenseRecord[]
  typeRatings: TypeRatingRecord[]
  classRatings: ClassRatingRecord[]
  medical: MedicalRecord[]
  activeBlocks: ActiveBlockRecord[]
}

/** Read port of the reports module. `q` matches the holder's name or document number. */
export interface ReportDataSource {
  load(filter: { q?: string }): Promise<ReportDataset>
  /** Spanish name of a license type, to print the filters on an export; null if unknown. */
  licenseTypeName(id: string): Promise<string | null>
}
