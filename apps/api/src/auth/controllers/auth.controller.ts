import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { type ChangePasswordInput, changePasswordSchema, type LoginRequest, loginRequestSchema } from '@sryg/types'
import type { Request } from 'express'
import { Public } from '../../common/decorators/public.decorator'
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { ChangePasswordService } from '../services/change-password.service'
import { GetAccessLogService } from '../services/get-access-log.service'
import { GetCurrentUserService } from '../services/get-current-user.service'
import { LoginService } from '../services/login.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: LoginService,
    private readonly currentUser: GetCurrentUserService,
    private readonly changePassword: ChangePasswordService,
    private readonly accessLog: GetAccessLogService,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(200)
  signIn(@Req() request: Request, @Body(new ZodValidationPipe(loginRequestSchema)) body: LoginRequest) {
    // `trust proxy` (configureApp) makes request.ip the client address behind the Render proxy.
    return this.login.execute(body, { ip: request.ip ?? null })
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return this.currentUser.execute(request.user.id)
  }

  /** D23: the latest successful and failed logins of the signed-in user. */
  @Get('me/access-log')
  myAccessLog(@Req() request: AuthenticatedRequest) {
    return this.accessLog.execute(request.user.id)
  }

  /** AUTH-08 / D4. Throttled per IP like the login: it also checks a password. */
  @UseGuards(ThrottlerGuard)
  @Post('change-password')
  @HttpCode(204)
  async changeOwnPassword(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
  ) {
    await this.changePassword.execute(request.user.id, body)
  }
}
