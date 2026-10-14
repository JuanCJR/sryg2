import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ThrottlerModule } from '@nestjs/throttler'
import { AUDIT_LOG, AuditModule } from '../audit/audit.module'
import type { AuditLog } from '../audit/domain/audit-log'
import type { Env } from '../config/env.schema'
import { GetCurrentUserUseCase } from './application/get-current-user.use-case'
import { LoginUseCase } from './application/login.use-case'
import type { PasswordHasher } from './domain/password-hasher'
import type { TokenIssuer } from './domain/token-issuer'
import type { UserRepository } from './domain/user-repository'
import { AuthController } from './http/auth.controller'
import { JwtAuthGuard } from './http/jwt-auth.guard'
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher'
import { DrizzleUserRepository } from './infrastructure/drizzle-user.repository'
import { JwtTokenIssuer } from './infrastructure/jwt-token-issuer'

type Config = ConfigService<Env, true>

@Module({
  imports: [
    AuditModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: Config) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { algorithm: 'HS256' },
      }),
    }),
    // Throttling is applied to login only (ThrottlerGuard on that route), not globally.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: Config) => [
        {
          limit: config.get('LOGIN_THROTTLE_LIMIT', { infer: true }),
          ttl: config.get('LOGIN_THROTTLE_TTL', { infer: true }) * 1000,
        },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    DrizzleUserRepository,
    JwtTokenIssuer,
    Argon2PasswordHasher,
    {
      provide: LoginUseCase,
      inject: [DrizzleUserRepository, Argon2PasswordHasher, JwtTokenIssuer, AUDIT_LOG],
      // The dummy hash uses the real parameters so unknown-email logins cost the same as real ones.
      useFactory: async (users: UserRepository, hasher: PasswordHasher, tokens: TokenIssuer, audit: AuditLog) =>
        new LoginUseCase(users, hasher, tokens, await hasher.hash('dummy-password-for-timing-parity'), audit),
    },
    {
      provide: GetCurrentUserUseCase,
      inject: [DrizzleUserRepository],
      useFactory: (users: UserRepository) => new GetCurrentUserUseCase(users),
    },
  ],
})
export class AuthModule {}
