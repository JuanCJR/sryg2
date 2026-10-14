import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { type LoginRequest, loginRequestSchema } from '@sryg/types'
import { GetCurrentUserUseCase } from '../application/get-current-user.use-case'
import { LoginUseCase } from '../application/login.use-case'
import { Public } from '../../shared/http/public.decorator'
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe'
import type { AuthenticatedRequest } from './jwt-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly currentUser: GetCurrentUserUseCase,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(200)
  signIn(@Body(new ZodValidationPipe(loginRequestSchema)) body: LoginRequest) {
    return this.login.execute(body)
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return this.currentUser.execute(request.user.id)
  }
}
