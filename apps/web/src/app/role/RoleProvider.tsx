import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ROLES, roleCan, type Role } from './permissions'
import { RoleContext } from './role-context'

const DEFAULT_ROLE: Role = 'administrador'

function readInitialRole(): Role {
  try {
    const params = new URLSearchParams(window.location.search)
    const fromQuery = params.get('rol')
    if (fromQuery && (ROLES as string[]).includes(fromQuery)) {
      return fromQuery as Role
    }
  } catch {
    /* no query string available (non-browser render) — fall back to the default */
  }
  return DEFAULT_ROLE
}

/** Demo role switch: reads `?rol=` once on first load, then overridable from the user menu. */
export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(() => readInitialRole())
  const can = useCallback((permission: Parameters<typeof roleCan>[1]) => roleCan(role, permission), [role])
  const value = useMemo(() => ({ role, setRole, can }), [role, can])

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}
