import { PATHS } from '../../../app/routes'

export type RouteArea = 'protected' | 'login'
export type RouteDecision = { kind: 'allow' } | { kind: 'redirect'; to: string }

export interface RouteInput {
  area: RouteArea
  pathname: string
  /** `location.search`, including the leading `?` (or empty). */
  search: string
  hasSession: boolean
  /** The session ended because the user signed out: there is no page to come back to. */
  signedOut?: boolean
  /** Paths that stay reachable without a session (e.g. the dev component catalog). */
  ungatedPaths?: readonly string[]
}

/** `next` is user input: only a same-origin path that is not the login itself is honored. */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return PATHS.panel
  if (next === PATHS.login || next.startsWith(`${PATHS.login}?`)) return PATHS.panel
  return next
}

function loginRedirect(pathname: string, search: string, signedOut: boolean): string {
  if (signedOut || pathname === '/') return PATHS.login
  return `${PATHS.login}?next=${encodeURIComponent(`${pathname}${search}`)}`
}

/**
 * Pure gate: protected routes need a session (otherwise the login, with `next` to come back, D4);
 * the login page must not show to an authenticated user.
 */
export function decideRoute({
  area,
  pathname,
  search,
  hasSession,
  signedOut = false,
  ungatedPaths = [],
}: RouteInput): RouteDecision {
  if (area === 'login') {
    if (!hasSession) return { kind: 'allow' }
    return { kind: 'redirect', to: safeNextPath(new URLSearchParams(search).get('next')) }
  }
  if (hasSession || ungatedPaths.includes(pathname)) return { kind: 'allow' }
  return { kind: 'redirect', to: loginRedirect(pathname, search, signedOut) }
}
