import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { can } from '@sryg/types'
import { PERMISSION_KEY, type RequiredPermission } from '../decorators/require-permission.decorator'
import type { AuthenticatedRequest } from './jwt-auth.guard'

const forbidden = () => new ForbiddenException({ statusCode: 403, error: 'Forbidden', message: 'Forbidden' })

/**
 * Global guard, run after JwtAuthGuard: a route marked with @RequirePermission is allowed only when
 * the permission matrix grants it to the user's role and area (AUTH-04). Unmarked routes only need
 * authentication.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required) return true
    const { user } = context.switchToHttp().getRequest<Partial<AuthenticatedRequest>>()
    if (!user || !can(user.role, user.area, required.module, required.action)) throw forbidden()
    return true
  }
}
