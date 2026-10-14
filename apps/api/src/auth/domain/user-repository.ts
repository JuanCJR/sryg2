import type { Role } from '@sryg/types'

export interface StoredUser {
  id: string
  email: string
  fullName: string
  role: Role
  passwordHash: string
  isActive: boolean
}

export interface UserRepository {
  /** Case-insensitive lookup. */
  findByEmail(email: string): Promise<StoredUser | null>
  findById(id: string): Promise<StoredUser | null>
}
