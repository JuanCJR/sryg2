import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { can as matrixCan, type AuthUser, type PermissionAction, type PermissionModule } from '@sryg/types'
import { useSession } from '../../shared/session/useSession'
import { fetchCurrentUser } from './current-user'
import { RoleContext, type RoleContextValue } from './role-context'

type Loaded = { token: string; nonce: number } & ({ status: 'ready'; user: AuthUser } | { status: 'error' })

/**
 * Loads the signed-in user from `/api/auth/me` whenever the session token changes (D4, D12) and
 * exposes its role, area and `can()`. A 401 there clears the session through fetchJson, and the
 * route gate takes the user back to the login.
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  const { token } = useSession()
  const [nonce, setNonce] = useState(0)
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetchCurrentUser().then(
      (user) => !cancelled && setLoaded({ token, nonce, status: 'ready', user }),
      () => !cancelled && setLoaded({ token, nonce, status: 'error' }),
    )
    return () => {
      cancelled = true
    }
  }, [token, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  // Derived, not set in the effect: a result for another token or attempt is stale, i.e. still loading.
  const current = token && loaded && loaded.token === token && loaded.nonce === nonce ? loaded : null
  const user = current?.status === 'ready' ? current.user : null
  const status: RoleContextValue['status'] = !token ? 'anonymous' : current ? current.status : 'loading'

  const can = useCallback(
    (module: PermissionModule, action: PermissionAction) =>
      user ? matrixCan(user.role, user.area, module, action) : false,
    [user],
  )

  const value = useMemo<RoleContextValue>(
    () => ({ status, user, role: user?.role ?? null, area: user?.area ?? null, can, reload }),
    [status, user, can, reload],
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}
