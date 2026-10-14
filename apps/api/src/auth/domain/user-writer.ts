import type { Role } from '@sryg/types'
import type { StoredUser } from './user-repository'

export interface NewUser {
  email: string
  fullName: string
  role: Role
  passwordHash: string
  isActive: boolean
}

export interface UserWriter {
  findByEmail(email: string): Promise<StoredUser | NewUser | null>
  create(user: NewUser): Promise<void>
}
