import { Navigate, Outlet, useLocation } from 'react-router'
import { sessionStore } from '../../../common/services/session'
import { useSession } from '../../../common/hooks/useSession'
import { decideRoute, type RouteArea } from '../utils/auth-gate'

export interface RouteGateProps {
  area: RouteArea
  ungatedPaths?: readonly string[]
}

/** Layout-route guard: renders the nested routes, or redirects according to the pure gate decision. */
export function RouteGate({ area, ungatedPaths }: RouteGateProps) {
  const { pathname, search } = useLocation()
  const { isAuthenticated } = useSession()
  const decision = decideRoute({
    area,
    pathname,
    search,
    hasSession: isAuthenticated,
    signedOut: sessionStore.signedOut(),
    ungatedPaths,
  })
  return decision.kind === 'redirect' ? <Navigate to={decision.to} replace /> : <Outlet />
}
