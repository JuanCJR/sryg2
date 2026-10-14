import type { Role, UserArea } from '@sryg/types'

export interface StoredUser {
  id: string
  email: string
  fullName: string
  role: Role
  area: UserArea
  passwordHash: string
  isActive: boolean
  mustChangePassword: boolean
}

export interface UserRepository {
  /** Case-insensitive lookup. */
  findByEmail(email: string): Promise<StoredUser | null>
  findById(id: string): Promise<StoredUser | null>
}
