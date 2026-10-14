import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { Env } from '../../config/env.schema'
import type { TokenClaims, TokenIssuer } from '../domain/token-issuer'

@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async issue(claims: TokenClaims) {
    const expiresIn = this.config.get('JWT_TTL_SECONDS', { infer: true })
    const accessToken = await this.jwt.signAsync({ ...claims }, { expiresIn })
    return { accessToken, expiresIn }
  }
}
