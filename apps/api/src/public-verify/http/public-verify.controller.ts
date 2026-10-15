import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { Public } from '../../shared/http/public.decorator'
import { VerifyCredentialUseCase } from '../application/verify-credential.use-case'

/**
 * The QR's target (D9): no authentication, throttled per IP with the same limit as the login, so
 * tokens cannot be enumerated quickly.
 */
@Controller('public/verify')
export class PublicVerifyController {
  constructor(private readonly verify: VerifyCredentialUseCase) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Get(':token')
  check(@Param('token') token: string) {
    return this.verify.execute(token)
  }
}
