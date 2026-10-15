import { createContext } from 'react'
import type { AuthUser, PermissionAction, PermissionModule, Role, UserArea } from '@sryg/types'

export type SessionStatus = 'anonymous' | 'loading' | 'error' | 'ready'

export interface RoleContextValue {
  /** `anonymous` without a token; `loading` while `/api/auth/me` resolves; `error` if it failed (not a 401). */
  status: SessionStatus
  user: AuthUser | null
  role: Role | null
  area: UserArea | null
  /** `can()` of packages/types for the signed-in user (D1, D24); false without a user. */
  can: (module: PermissionModule, action: PermissionAction) => boolean
  /** Asks `/api/auth/me` again (after an error, or after the user changes their own data). */
  reload: () => void
}

export const RoleContext = createContext<RoleContextValue | null>(null)
