import type { ReactNode } from 'react'
import type { PermissionAction, PermissionModule } from '@sryg/types'
import { ForbiddenPage } from '../errors/ForbiddenPage'
import { useRole } from './useRole'

export interface RequirePermissionProps {
  module: PermissionModule
  action: PermissionAction
  children: ReactNode
}

/** Renders `children` when `can(role, area, module, action)` allows it (D1, D24), the 403 page otherwise. */
export function RequirePermission({ module, action, children }: RequirePermissionProps) {
  const { can } = useRole()
  return can(module, action) ? <>{children}</> : <ForbiddenPage />
}
