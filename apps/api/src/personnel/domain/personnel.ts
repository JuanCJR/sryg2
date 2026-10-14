import type { BloodType, PersonnelStatus, Rav60Category } from '@sryg/types'

export const PERSONNEL_ENTITY = 'personal_aeronautico'

export interface Personnel {
  id: string
  cedula: string
  fullName: string
  email: string | null
  phone: string | null
  bloodType: BloodType | null
  cargo: string | null
  dependencia: string | null
  category: Rav60Category | null
  status: PersonnelStatus
  photoRef: string | null
  createdAt: Date
  updatedAt: Date
}

/** Fields a client may set. `status` falls back to the database default (activo) when omitted. */
export type NewPersonnel = Omit<Personnel, 'id' | 'status' | 'photoRef' | 'createdAt' | 'updatedAt'> & {
  status?: PersonnelStatus
}

export type PersonnelChanges = Partial<NewPersonnel>
