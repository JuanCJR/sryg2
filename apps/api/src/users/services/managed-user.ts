import type { Role, UserArea } from '@sryg/types'

export const USER_ENTITY = 'usuario'

/** The Admin performing a mutation; access was already checked by the permission guard. */
export interface Actor {
  id: string
}

/** A user as the administration sees it: never any password data. */
export interface ManagedUser {
  id: string
  email: string
  fullName: string
  role: Role
  area: UserArea
  isActive: boolean
  mustChangePassword: boolean
  createdAt: Date
  updatedAt: Date
}

export interface NewManagedUser {
  email: string
  fullName: string
  role: Role
  area: UserArea
  passwordHash: string
  mustChangePassword: boolean
}

export type ManagedUserChanges = Partial<
  Pick<ManagedUser, 'fullName' | 'role' | 'area' | 'isActive' | 'mustChangePassword'> & { passwordHash: string }
>
