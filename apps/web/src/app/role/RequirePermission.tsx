import type { ReactNode } from 'react'
import { ErrorTemplate } from '../templates/ErrorTemplate'
import type { Permission } from './permissions'
import { useRole } from './useRole'

export interface RequirePermissionProps {
  permission: Permission
  children: ReactNode
}

/** Renders `children` when the current demo role has `permission`, a 403 template otherwise. */
export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const { can } = useRole()
  if (!can(permission)) {
    return (
      <ErrorTemplate
        code="403"
        title="Acceso restringido"
        explanation="Su rol de demostración no tiene permiso para ver esta pantalla."
      />
    )
  }
  return <>{children}</>
}
