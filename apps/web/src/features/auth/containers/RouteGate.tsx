import { Navigate, Outlet, useLocation } from 'react-router'
import { decideRoute, type RouteArea } from '../domain/auth-gate'
import { useSession } from './useSession'

export interface RouteGateProps {
  area: RouteArea
  ungatedPaths?: readonly string[]
}

/** Layout-route guard: renders the nested routes, or redirects according to the pure gate decision. */
export function RouteGate({ area, ungatedPaths }: RouteGateProps) {
  const { pathname } = useLocation()
  const { isAuthenticated } = useSession()
  const decision = decideRoute({ area, pathname, hasSession: isAuthenticated, ungatedPaths })
  return decision.kind === 'redirect' ? <Navigate to={decision.to} replace /> : <Outlet />
}
