import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import type { Role, UserArea } from '@sryg/types'
import { IS_PUBLIC_KEY } from '../../shared/http/public.decorator'

export interface AuthenticatedUser {
  id: string
  email: string
  role: Role
  area: UserArea
}

export type AuthenticatedRequest = Request & { user: AuthenticatedUser }

const unauthorized = () =>
  new UnauthorizedException({ statusCode: 401, error: 'Unauthorized', message: 'Unauthorized' })

/** Global guard: every route requires a valid bearer token unless marked @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]))
      return true
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const [scheme, token] = request.headers.authorization?.split(' ') ?? []
    if (scheme !== 'Bearer' || !token) throw unauthorized()
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string; role: Role; area: UserArea }>(token, {
        algorithms: ['HS256'],
      })
      request.user = { id: payload.sub, email: payload.email, role: payload.role, area: payload.area }
    } catch {
      throw unauthorized()
    }
    return true
  }
}
