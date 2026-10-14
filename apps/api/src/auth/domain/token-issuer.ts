import type { Role } from '@sryg/types'

export interface TokenClaims {
  sub: string
  email: string
  role: Role
}

export interface TokenIssuer {
  issue(claims: TokenClaims): Promise<{ accessToken: string; expiresIn: number }>
}
