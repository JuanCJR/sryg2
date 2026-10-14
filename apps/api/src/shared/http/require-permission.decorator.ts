import { SetMetadata } from '@nestjs/common'
import type { PermissionAction, PermissionModule } from '@sryg/types'

export const PERMISSION_KEY = 'requiredPermission'

export interface RequiredPermission {
  module: PermissionModule
  action: PermissionAction
}

/**
 * Restricts a route (or every route of a controller) to the users that `can(role, area, module,
 * action)` allows (D1, D24). Enforced by the global PermissionGuard, which answers 403 otherwise.
 */
export const RequirePermission = (module: PermissionModule, action: PermissionAction) =>
  SetMetadata(PERMISSION_KEY, { module, action } satisfies RequiredPermission)
