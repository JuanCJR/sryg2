import type { Role, UserArea } from '@sryg/types'
import type { StoredUser } from './user-repository'

export interface NewUser {
  email: string
  fullName: string
  role: Role
  area: UserArea
  passwordHash: string
  isActive: boolean
  mustChangePassword: boolean
}

export interface UserWriter {
  findByEmail(email: string): Promise<StoredUser | NewUser | null>
  create(user: NewUser): Promise<void>
}
