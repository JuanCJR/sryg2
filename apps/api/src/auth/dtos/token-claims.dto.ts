import type { Role, UserArea } from '@sryg/types'

export interface TokenClaims {
  sub: string
  email: string
  role: Role
  /** D24: read by the permission guard together with the role. */
  area: UserArea
}
