import type { BloodType, PersonnelStatus, Rav60Category } from '@sryg/types'

export const PERSONNEL_ENTITY = 'personal_aeronautico'

/** The user performing a mutation; access was already checked by the permission guard. */
export interface Actor {
  id: string
}

export interface Personnel {
  id: string
  cedula: string
  firstNames: string
  lastNames: string
  documentTypeId: string | null
  nationalityId: string | null
  /** `YYYY-MM-DD`. */
  birthDate: string | null
  address: string | null
  email: string | null
  phone: string | null
  bloodType: BloodType | null
  cargo: string | null
  dependencia: string | null
  category: Rav60Category | null
  status: PersonnelStatus
  /** The photo and the signature bytes are never loaded with the record (D5). */
  hasPhoto: boolean
  hasSignature: boolean
  createdAt: Date
  updatedAt: Date
}

/** Fields a client may set. `status` falls back to the database default (activo) when omitted. */
export type NewPersonnel = Omit<
  Personnel,
  'id' | 'status' | 'hasPhoto' | 'hasSignature' | 'createdAt' | 'updatedAt'
> & {
  status?: PersonnelStatus
}

export type PersonnelChanges = Partial<NewPersonnel>
