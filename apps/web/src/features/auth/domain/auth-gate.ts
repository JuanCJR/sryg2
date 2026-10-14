import { PATHS } from '../../../app/routes'

export type RouteArea = 'protected' | 'login'
export type RouteDecision = { kind: 'allow' } | { kind: 'redirect'; to: string }

export interface RouteInput {
  area: RouteArea
  pathname: string
  hasSession: boolean
  /** Paths that stay reachable without a session (e.g. the dev component catalog). */
  ungatedPaths?: readonly string[]
}

/** Pure gate: protected routes need a session, the login page must not show to an authenticated user. */
export function decideRoute({ area, pathname, hasSession, ungatedPaths = [] }: RouteInput): RouteDecision {
  if (area === 'login') return hasSession ? { kind: 'redirect', to: PATHS.panel } : { kind: 'allow' }
  if (hasSession || ungatedPaths.includes(pathname)) return { kind: 'allow' }
  return { kind: 'redirect', to: PATHS.login }
}
