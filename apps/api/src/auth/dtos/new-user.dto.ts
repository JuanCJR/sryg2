import type { Role, UserArea } from '@sryg/types'

export interface NewUser {
  email: string
  fullName: string
  role: Role
  area: UserArea
  passwordHash: string
  isActive: boolean
  mustChangePassword: boolean
}
