import { createContext } from 'react'
import type { Permission, Role } from './permissions'

export interface RoleContextValue {
  role: Role
  setRole: (role: Role) => void
  can: (permission: Permission) => boolean
}

export const RoleContext = createContext<RoleContextValue | null>(null)
