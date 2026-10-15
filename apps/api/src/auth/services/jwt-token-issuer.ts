import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { Env } from '../../common/config/env.schema'
import type { TokenClaims } from '../dtos/token-claims.dto'

@Injectable()
export class JwtTokenIssuer {
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
